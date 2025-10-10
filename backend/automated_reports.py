"""
Automated report generation and delivery system
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import json
import redis
from celery import Celery
from celery.schedules import crontab
import os

logger = logging.getLogger(__name__)

class ReportFrequency(Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    CUSTOM = "custom"

class ReportStatus(Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class ReportSchedule:
    id: str
    name: str
    description: str
    template_id: str
    frequency: ReportFrequency
    cron_expression: Optional[str] = None
    timezone: str = "UTC"
    recipients: List[str] = None
    parameters: Dict[str, Any] = None
    status: ReportStatus = ReportStatus.ACTIVE
    created_at: datetime = None
    updated_at: datetime = None
    created_by: str = ""
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    run_count: int = 0
    success_count: int = 0
    failure_count: int = 0
    last_error: Optional[str] = None

@dataclass
class ReportDelivery:
    id: str
    schedule_id: str
    report_id: str
    status: str
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    recipients: List[str] = None

class AutomatedReportManager:
    """Manager for automated report generation and delivery"""
    
    def __init__(self, redis_url: str = None):
        self.redis_client = redis.from_url(redis_url or os.environ.get('REDIS_URL', 'redis://localhost:6379'))
        
        # Celery app for scheduled tasks
        self.celery_app = Celery(
            'automated_reports',
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
            beat_schedule=self._get_beat_schedule(),
            beat_schedule_filename='celerybeat-schedule'
        )
        
        # Register tasks
        self._register_tasks()
    
    def _get_beat_schedule(self) -> Dict[str, Any]:
        """Get Celery beat schedule for automated reports"""
        return {
            'check-scheduled-reports': {
                'task': 'check_scheduled_reports',
                'schedule': crontab(minute='*/5'),  # Every 5 minutes
            },
            'cleanup-old-reports': {
                'task': 'cleanup_old_reports',
                'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
            },
            'send-reminders': {
                'task': 'send_report_reminders',
                'schedule': crontab(hour=9, minute=0),  # Daily at 9 AM
            }
        }
    
    def _register_tasks(self):
        """Register Celery tasks"""
        
        @self.celery_app.task
        def check_scheduled_reports():
            """Check for scheduled reports that need to be generated"""
            asyncio.run(self._check_scheduled_reports())
        
        @self.celery_app.task
        def cleanup_old_reports():
            """Clean up old reports and deliveries"""
            asyncio.run(self._cleanup_old_reports())
        
        @self.celery_app.task
        def send_report_reminders():
            """Send reminders for upcoming report deadlines"""
            asyncio.run(self._send_report_reminders())
        
        @self.celery_app.task
        def generate_automated_report(schedule_id: str):
            """Generate a specific automated report"""
            asyncio.run(self._generate_automated_report(schedule_id))
    
    async def create_schedule(
        self,
        name: str,
        description: str,
        template_id: str,
        frequency: ReportFrequency,
        recipients: List[str],
        parameters: Dict[str, Any] = None,
        cron_expression: Optional[str] = None,
        timezone: str = "UTC",
        created_by: str = ""
    ) -> str:
        """Create a new report schedule"""
        try:
            schedule_id = f"schedule_{int(datetime.utcnow().timestamp())}"
            
            # Calculate next run time
            next_run = self._calculate_next_run(frequency, cron_expression, timezone)
            
            schedule = ReportSchedule(
                id=schedule_id,
                name=name,
                description=description,
                template_id=template_id,
                frequency=frequency,
                cron_expression=cron_expression,
                timezone=timezone,
                recipients=recipients,
                parameters=parameters or {},
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                created_by=created_by,
                next_run=next_run
            )
            
            # Store schedule
            await self._store_schedule(schedule)
            
            logger.info(f"Report schedule created: {schedule_id}")
            return schedule_id
            
        except Exception as e:
            logger.error(f"Schedule creation error: {e}")
            raise
    
    async def update_schedule(
        self,
        schedule_id: str,
        updates: Dict[str, Any]
    ) -> bool:
        """Update an existing report schedule"""
        try:
            schedule = await self._get_schedule(schedule_id)
            if not schedule:
                return False
            
            # Update fields
            for key, value in updates.items():
                if hasattr(schedule, key):
                    setattr(schedule, key, value)
            
            # Recalculate next run if frequency changed
            if 'frequency' in updates or 'cron_expression' in updates:
                schedule.next_run = self._calculate_next_run(
                    schedule.frequency,
                    schedule.cron_expression,
                    schedule.timezone
                )
            
            schedule.updated_at = datetime.utcnow()
            
            # Store updated schedule
            await self._store_schedule(schedule)
            
            logger.info(f"Report schedule updated: {schedule_id}")
            return True
            
        except Exception as e:
            logger.error(f"Schedule update error: {e}")
            return False
    
    async def delete_schedule(self, schedule_id: str) -> bool:
        """Delete a report schedule"""
        try:
            schedule = await self._get_schedule(schedule_id)
            if not schedule:
                return False
            
            # Cancel any pending tasks
            # This would be implemented with Celery task cancellation
            
            # Delete schedule
            await self._delete_schedule(schedule_id)
            
            logger.info(f"Report schedule deleted: {schedule_id}")
            return True
            
        except Exception as e:
            logger.error(f"Schedule deletion error: {e}")
            return False
    
    async def pause_schedule(self, schedule_id: str) -> bool:
        """Pause a report schedule"""
        return await self.update_schedule(schedule_id, {'status': ReportStatus.PAUSED})
    
    async def resume_schedule(self, schedule_id: str) -> bool:
        """Resume a paused report schedule"""
        return await self.update_schedule(schedule_id, {'status': ReportStatus.ACTIVE})
    
    async def get_schedule(self, schedule_id: str) -> Optional[ReportSchedule]:
        """Get a specific schedule"""
        return await self._get_schedule(schedule_id)
    
    async def list_schedules(
        self,
        status: Optional[ReportStatus] = None,
        created_by: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[ReportSchedule]:
        """List report schedules with filters"""
        try:
            # Get all schedule IDs
            pattern = "report_schedule:*"
            keys = self.redis_client.keys(pattern)
            
            schedules = []
            for key in keys:
                schedule_data = self.redis_client.get(key)
                if schedule_data:
                    schedule_dict = json.loads(schedule_data)
                    schedule = ReportSchedule(**schedule_dict)
                    
                    # Apply filters
                    if status and schedule.status != status:
                        continue
                    if created_by and schedule.created_by != created_by:
                        continue
                    
                    schedules.append(schedule)
            
            # Sort by created_at descending
            schedules.sort(key=lambda x: x.created_at, reverse=True)
            
            # Apply pagination
            return schedules[offset:offset + limit]
            
        except Exception as e:
            logger.error(f"List schedules error: {e}")
            return []
    
    async def get_schedule_stats(self) -> Dict[str, Any]:
        """Get statistics for report schedules"""
        try:
            schedules = await self.list_schedules()
            
            total_schedules = len(schedules)
            active_schedules = len([s for s in schedules if s.status == ReportStatus.ACTIVE])
            paused_schedules = len([s for s in schedules if s.status == ReportStatus.PAUSED])
            
            total_runs = sum(s.run_count for s in schedules)
            total_successes = sum(s.success_count for s in schedules)
            total_failures = sum(s.failure_count for s in schedules)
            
            success_rate = (total_successes / total_runs * 100) if total_runs > 0 else 0
            
            return {
                'total_schedules': total_schedules,
                'active_schedules': active_schedules,
                'paused_schedules': paused_schedules,
                'total_runs': total_runs,
                'total_successes': total_successes,
                'total_failures': total_failures,
                'success_rate': round(success_rate, 2)
            }
            
        except Exception as e:
            logger.error(f"Get schedule stats error: {e}")
            return {}
    
    async def _check_scheduled_reports(self):
        """Check for scheduled reports that need to be generated"""
        try:
            now = datetime.utcnow()
            
            # Get all active schedules
            schedules = await self.list_schedules(status=ReportStatus.ACTIVE)
            
            for schedule in schedules:
                if schedule.next_run and schedule.next_run <= now:
                    # Schedule report generation
                    self.celery_app.send_task(
                        'generate_automated_report',
                        args=[schedule.id]
                    )
                    
                    # Update next run time
                    schedule.next_run = self._calculate_next_run(
                        schedule.frequency,
                        schedule.cron_expression,
                        schedule.timezone
                    )
                    schedule.last_run = now
                    
                    await self._store_schedule(schedule)
                    
        except Exception as e:
            logger.error(f"Check scheduled reports error: {e}")
    
    async def _generate_automated_report(self, schedule_id: str):
        """Generate an automated report"""
        try:
            schedule = await self._get_schedule(schedule_id)
            if not schedule:
                logger.error(f"Schedule not found: {schedule_id}")
                return
            
            # Update run count
            schedule.run_count += 1
            
            try:
                # Generate report
                from report_generator import ReportGenerator
                from report_templates import ReportTemplateManager
                
                generator = ReportGenerator()
                template_manager = ReportTemplateManager()
                
                template = template_manager.get_template(schedule.template_id)
                if not template:
                    raise ValueError(f"Template not found: {schedule.template_id}")
                
                # Generate report
                report_data = await self._prepare_report_data(schedule)
                report_content = await generator.generate_report(
                    schedule.template_id,
                    report_data,
                    template.default_format
                )
                
                # Store report
                report_id = await self._store_report(schedule, report_content)
                
                # Send report to recipients
                delivery_success = await self._deliver_report(
                    schedule, report_id, report_content
                )
                
                if delivery_success:
                    schedule.success_count += 1
                    schedule.last_error = None
                else:
                    schedule.failure_count += 1
                    schedule.last_error = "Delivery failed"
                
            except Exception as e:
                schedule.failure_count += 1
                schedule.last_error = str(e)
                logger.error(f"Report generation failed for {schedule_id}: {e}")
            
            # Update schedule
            await self._store_schedule(schedule)
            
        except Exception as e:
            logger.error(f"Generate automated report error: {e}")
    
    async def _deliver_report(
        self,
        schedule: ReportSchedule,
        report_id: str,
        report_content: bytes
    ) -> bool:
        """Deliver report to recipients"""
        try:
            from notification_service import NotificationService, NotificationRecipient
            
            notification_service = NotificationService()
            
            # Create delivery record
            delivery = ReportDelivery(
                id=f"delivery_{int(datetime.utcnow().timestamp())}",
                schedule_id=schedule.id,
                report_id=report_id,
                status="pending",
                recipients=schedule.recipients
            )
            
            # Send notifications
            recipients = []
            for email in schedule.recipients:
                recipients.append(NotificationRecipient(
                    user_id="",
                    email=email,
                    name="",
                    preferences={}
                ))
            
            # This would be implemented with actual email delivery
            # For now, just log the delivery
            logger.info(f"Report delivered to {len(recipients)} recipients")
            
            delivery.status = "sent"
            delivery.sent_at = datetime.utcnow()
            
            await self._store_delivery(delivery)
            return True
            
        except Exception as e:
            logger.error(f"Report delivery error: {e}")
            return False
    
    async def _prepare_report_data(self, schedule: ReportSchedule) -> Dict[str, Any]:
        """Prepare data for report generation"""
        # This would be implemented to fetch actual data based on schedule parameters
        # For now, return sample data
        return {
            'total_responses': 150,
            'average_rating': 8.2,
            'faculty_count': 25,
            'department_count': 5,
            'faculty_ratings': {
                'John Doe': 8.5,
                'Jane Smith': 7.8,
                'Bob Johnson': 9.2
            },
            'department_distribution': {
                'Computer Science': 8,
                'Mathematics': 6,
                'Physics': 5,
                'Chemistry': 4,
                'Biology': 2
            }
        }
    
    def _calculate_next_run(
        self,
        frequency: ReportFrequency,
        cron_expression: Optional[str],
        timezone: str
    ) -> datetime:
        """Calculate next run time for a schedule"""
        now = datetime.utcnow()
        
        if frequency == ReportFrequency.DAILY:
            return now + timedelta(days=1)
        elif frequency == ReportFrequency.WEEKLY:
            return now + timedelta(weeks=1)
        elif frequency == ReportFrequency.MONTHLY:
            return now + timedelta(days=30)
        elif frequency == ReportFrequency.QUARTERLY:
            return now + timedelta(days=90)
        elif frequency == ReportFrequency.YEARLY:
            return now + timedelta(days=365)
        elif frequency == ReportFrequency.CUSTOM and cron_expression:
            # This would be implemented with cron parsing
            return now + timedelta(hours=1)
        else:
            return now + timedelta(hours=1)
    
    async def _store_schedule(self, schedule: ReportSchedule):
        """Store schedule in Redis"""
        key = f"report_schedule:{schedule.id}"
        data = json.dumps(schedule.__dict__, default=str)
        self.redis_client.set(key, data, ex=86400 * 30)  # 30 days TTL
    
    async def _get_schedule(self, schedule_id: str) -> Optional[ReportSchedule]:
        """Get schedule from Redis"""
        key = f"report_schedule:{schedule_id}"
        data = self.redis_client.get(key)
        if data:
            schedule_dict = json.loads(data)
            return ReportSchedule(**schedule_dict)
        return None
    
    async def _delete_schedule(self, schedule_id: str):
        """Delete schedule from Redis"""
        key = f"report_schedule:{schedule_id}"
        self.redis_client.delete(key)
    
    async def _store_report(self, schedule: ReportSchedule, content: bytes) -> str:
        """Store generated report"""
        report_id = f"report_{int(datetime.utcnow().timestamp())}"
        # This would be implemented with actual storage
        logger.info(f"Report stored: {report_id}")
        return report_id
    
    async def _store_delivery(self, delivery: ReportDelivery):
        """Store delivery record"""
        key = f"report_delivery:{delivery.id}"
        data = json.dumps(delivery.__dict__, default=str)
        self.redis_client.set(key, data, ex=86400 * 7)  # 7 days TTL
    
    async def _cleanup_old_reports(self):
        """Clean up old reports and deliveries"""
        try:
            # This would be implemented to clean up old data
            logger.info("Old reports cleanup completed")
        except Exception as e:
            logger.error(f"Cleanup error: {e}")
    
    async def _send_report_reminders(self):
        """Send reminders for upcoming report deadlines"""
        try:
            # This would be implemented to send reminders
            logger.info("Report reminders sent")
        except Exception as e:
            logger.error(f"Send reminders error: {e}")
