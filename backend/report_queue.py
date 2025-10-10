"""
Report generation queue system
"""
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from enum import Enum
from dataclasses import dataclass, asdict
import redis
from celery import Celery
import os

logger = logging.getLogger(__name__)

class ReportStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ReportType(Enum):
    FACULTY_ANALYTICS = "faculty_analytics"
    STUDENT_FEEDBACK = "student_feedback"
    DEPARTMENT_SUMMARY = "department_summary"
    TREND_ANALYSIS = "trend_analysis"
    CUSTOM_REPORT = "custom_report"

class ReportFormat(Enum):
    PDF = "pdf"
    EXCEL = "xlsx"
    CSV = "csv"
    JSON = "json"

@dataclass
class ReportRequest:
    id: str
    user_id: str
    user_type: str
    report_type: ReportType
    format: ReportFormat
    parameters: Dict[str, Any]
    priority: int = 1  # 1 = high, 2 = medium, 3 = low
    status: ReportStatus = ReportStatus.PENDING
    created_at: datetime = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    file_id: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()

class ReportQueue:
    """Queue system for managing report generation"""
    
    def __init__(self, redis_url: str = None):
        self.redis_client = redis.from_url(redis_url or os.environ.get('REDIS_URL', 'redis://localhost:6379'))
        self.queue_name = "report_queue"
        self.processing_queue = "report_processing"
        self.completed_queue = "report_completed"
        self.failed_queue = "report_failed"
        
        # Celery app for background processing
        self.celery_app = Celery(
            'report_generator',
            broker=redis_url or os.environ.get('REDIS_URL', 'redis://localhost:6379'),
            backend=redis_url or os.environ.get('REDIS_URL', 'redis://localhost:6379')
        )
        
        # Configure Celery
        self.celery_app.conf.update(
            task_serializer='json',
            accept_content=['json'],
            result_serializer='json',
            timezone='UTC',
            enable_utc=True,
            task_track_started=True,
            task_time_limit=1800,  # 30 minutes
            task_soft_time_limit=1500,  # 25 minutes
            worker_prefetch_multiplier=1,
            task_acks_late=True,
            worker_disable_rate_limits=True
        )
    
    async def submit_report_request(
        self,
        user_id: str,
        user_type: str,
        report_type: ReportType,
        format: ReportFormat,
        parameters: Dict[str, Any],
        priority: int = 1
    ) -> str:
        """Submit a new report generation request"""
        try:
            # Generate unique request ID
            request_id = f"report_{int(datetime.utcnow().timestamp())}_{user_id}"
            
            # Create report request
            request = ReportRequest(
                id=request_id,
                user_id=user_id,
                user_type=user_type,
                report_type=report_type,
                format=format,
                parameters=parameters,
                priority=priority
            )
            
            # Store request in Redis
            await self._store_request(request)
            
            # Add to queue
            await self._enqueue_request(request)
            
            # Start background task
            self._start_report_generation.delay(request_id)
            
            logger.info(f"Report request submitted: {request_id}")
            return request_id
            
        except Exception as e:
            logger.error(f"Failed to submit report request: {e}")
            raise
    
    async def get_request_status(self, request_id: str) -> Optional[ReportRequest]:
        """Get the status of a report request"""
        try:
            return await self._get_request(request_id)
        except Exception as e:
            logger.error(f"Failed to get request status: {e}")
            return None
    
    async def cancel_request(self, request_id: str, user_id: str) -> bool:
        """Cancel a pending report request"""
        try:
            request = await self._get_request(request_id)
            if not request:
                return False
            
            # Check if user can cancel this request
            if request.user_id != user_id:
                return False
            
            # Only cancel pending requests
            if request.status != ReportStatus.PENDING:
                return False
            
            # Update status
            request.status = ReportStatus.CANCELLED
            request.completed_at = datetime.utcnow()
            
            # Store updated request
            await self._store_request(request)
            
            # Remove from queue
            await self._dequeue_request(request_id)
            
            logger.info(f"Report request cancelled: {request_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cancel request: {e}")
            return False
    
    async def get_user_requests(
        self,
        user_id: str,
        status: Optional[ReportStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[ReportRequest]:
        """Get report requests for a user"""
        try:
            # Get all request IDs for user
            pattern = f"report_request:{user_id}:*"
            keys = self.redis_client.keys(pattern)
            
            requests = []
            for key in keys:
                request_data = self.redis_client.get(key)
                if request_data:
                    request_dict = json.loads(request_data)
                    request = ReportRequest(**request_dict)
                    
                    # Apply status filter
                    if status and request.status != status:
                        continue
                    
                    requests.append(request)
            
            # Sort by created_at descending
            requests.sort(key=lambda x: x.created_at, reverse=True)
            
            # Apply pagination
            return requests[offset:offset + limit]
            
        except Exception as e:
            logger.error(f"Failed to get user requests: {e}")
            return []
    
    async def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        try:
            pending_count = self.redis_client.llen(self.queue_name)
            processing_count = self.redis_client.llen(self.processing_queue)
            completed_count = self.redis_client.llen(self.completed_queue)
            failed_count = self.redis_client.llen(self.failed_queue)
            
            # Get recent requests
            recent_requests = []
            pattern = "report_request:*"
            keys = self.redis_client.keys(pattern)
            
            for key in keys[-10:]:  # Last 10 requests
                request_data = self.redis_client.get(key)
                if request_data:
                    request_dict = json.loads(request_data)
                    recent_requests.append(request_dict)
            
            return {
                'pending_count': pending_count,
                'processing_count': processing_count,
                'completed_count': completed_count,
                'failed_count': failed_count,
                'total_requests': pending_count + processing_count + completed_count + failed_count,
                'recent_requests': recent_requests
            }
            
        except Exception as e:
            logger.error(f"Failed to get queue stats: {e}")
            return {}
    
    async def cleanup_old_requests(self, days_old: int = 7) -> int:
        """Clean up old completed/failed requests"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            cleaned_count = 0
            
            # Get all request keys
            pattern = "report_request:*"
            keys = self.redis_client.keys(pattern)
            
            for key in keys:
                request_data = self.redis_client.get(key)
                if request_data:
                    request_dict = json.loads(request_data)
                    request = ReportRequest(**request_dict)
                    
                    # Check if request is old and completed/failed
                    if (request.created_at < cutoff_date and 
                        request.status in [ReportStatus.COMPLETED, ReportStatus.FAILED, ReportStatus.CANCELLED]):
                        
                        # Delete request
                        self.redis_client.delete(key)
                        cleaned_count += 1
            
            logger.info(f"Cleaned up {cleaned_count} old requests")
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup old requests: {e}")
            return 0
    
    async def retry_failed_requests(self) -> int:
        """Retry failed requests that haven't exceeded max retries"""
        try:
            retry_count = 0
            pattern = "report_request:*"
            keys = self.redis_client.keys(pattern)
            
            for key in keys:
                request_data = self.redis_client.get(key)
                if request_data:
                    request_dict = json.loads(request_data)
                    request = ReportRequest(**request_dict)
                    
                    # Check if request failed and can be retried
                    if (request.status == ReportStatus.FAILED and 
                        request.retry_count < request.max_retries):
                        
                        # Reset status and increment retry count
                        request.status = ReportStatus.PENDING
                        request.retry_count += 1
                        request.error_message = None
                        
                        # Store updated request
                        await self._store_request(request)
                        
                        # Re-enqueue
                        await self._enqueue_request(request)
                        
                        # Start background task
                        self._start_report_generation.delay(request.id)
                        
                        retry_count += 1
            
            logger.info(f"Retried {retry_count} failed requests")
            return retry_count
            
        except Exception as e:
            logger.error(f"Failed to retry failed requests: {e}")
            return 0
    
    async def _store_request(self, request: ReportRequest):
        """Store report request in Redis"""
        key = f"report_request:{request.user_id}:{request.id}"
        data = json.dumps(asdict(request), default=str)
        self.redis_client.set(key, data, ex=86400 * 30)  # 30 days TTL
    
    async def _get_request(self, request_id: str) -> Optional[ReportRequest]:
        """Get report request from Redis"""
        pattern = f"report_request:*:{request_id}"
        keys = self.redis_client.keys(pattern)
        
        if keys:
            request_data = self.redis_client.get(keys[0])
            if request_data:
                request_dict = json.loads(request_data)
                return ReportRequest(**request_dict)
        
        return None
    
    async def _enqueue_request(self, request: ReportRequest):
        """Add request to queue"""
        # Use priority-based queuing
        if request.priority == 1:  # High priority
            self.redis_client.lpush(self.queue_name, request.id)
        else:  # Medium/Low priority
            self.redis_client.rpush(self.queue_name, request.id)
    
    async def _dequeue_request(self, request_id: str):
        """Remove request from queue"""
        self.redis_client.lrem(self.queue_name, 0, request_id)
    
    @self.celery_app.task(bind=True)
    def _start_report_generation(self, request_id: str):
        """Start report generation process"""
        try:
            # This would be implemented in a separate worker process
            # For now, just log the request
            logger.info(f"Starting report generation for request: {request_id}")
            
            # In a real implementation, this would:
            # 1. Update request status to PROCESSING
            # 2. Generate the report
            # 3. Upload to storage
            # 4. Update request status to COMPLETED
            # 5. Send notification to user
            
        except Exception as e:
            logger.error(f"Report generation failed: {e}")
            # Update request status to FAILED
            # Store error message
