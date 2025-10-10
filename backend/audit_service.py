"""
Audit trail and activity logging system
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, asdict
from enum import Enum
import json
import redis
import uuid
import hashlib

logger = logging.getLogger(__name__)

class AuditAction(Enum):
    # User Management
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    USER_DELETED = "user_deleted"
    USER_ACTIVATED = "user_activated"
    USER_DEACTIVATED = "user_deactivated"
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    USER_PASSWORD_CHANGED = "user_password_changed"
    USER_PASSWORD_RESET = "user_password_reset"
    
    # Faculty Management
    FACULTY_CREATED = "faculty_created"
    FACULTY_UPDATED = "faculty_updated"
    FACULTY_DELETED = "faculty_deleted"
    FACULTY_ASSIGNED = "faculty_assigned"
    FACULTY_UNASSIGNED = "faculty_unassigned"
    
    # Student Management
    STUDENT_CREATED = "student_created"
    STUDENT_UPDATED = "student_updated"
    STUDENT_DELETED = "student_deleted"
    STUDENT_ENROLLED = "student_enrolled"
    STUDENT_UNENROLLED = "student_unenrolled"
    
    # Feedback Management
    FEEDBACK_SUBMITTED = "feedback_submitted"
    FEEDBACK_UPDATED = "feedback_updated"
    FEEDBACK_DELETED = "feedback_deleted"
    FEEDBACK_APPROVED = "feedback_approved"
    FEEDBACK_REJECTED = "feedback_rejected"
    
    # Report Management
    REPORT_GENERATED = "report_generated"
    REPORT_DOWNLOADED = "report_downloaded"
    REPORT_SHARED = "report_shared"
    REPORT_DELETED = "report_deleted"
    
    # System Management
    SYSTEM_CONFIG_UPDATED = "system_config_updated"
    BACKUP_CREATED = "backup_created"
    BACKUP_RESTORED = "backup_restored"
    MAINTENANCE_MODE_ENABLED = "maintenance_mode_enabled"
    MAINTENANCE_MODE_DISABLED = "maintenance_mode_disabled"
    
    # Security
    SECURITY_ALERT = "security_alert"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    
    # Data Management
    DATA_EXPORTED = "data_exported"
    DATA_IMPORTED = "data_imported"
    DATA_DELETED = "data_deleted"
    DATA_ARCHIVED = "data_archived"

class AuditLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class AuditEntry:
    id: str
    timestamp: datetime
    user_id: str
    user_type: str
    action: AuditAction
    level: AuditLevel
    resource_type: str
    resource_id: str
    description: str
    details: Dict[str, Any]
    ip_address: str
    user_agent: str
    session_id: str
    success: bool
    error_message: Optional[str] = None
    tags: List[str] = None
    metadata: Dict[str, Any] = None

@dataclass
class AuditFilter:
    user_id: Optional[str] = None
    user_type: Optional[str] = None
    action: Optional[AuditAction] = None
    level: Optional[AuditLevel] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    success: Optional[bool] = None
    tags: Optional[List[str]] = None

class AuditService:
    """Service for audit trail and activity logging"""
    
    def __init__(self, redis_url: str = None):
        self.redis_client = redis.from_url(redis_url or os.environ.get('REDIS_URL', 'redis://localhost:6379'))
        self.audit_retention_days = 365  # 1 year
        self.critical_retention_days = 2555  # 7 years
    
    async def log_activity(
        self,
        user_id: str,
        user_type: str,
        action: AuditAction,
        resource_type: str,
        resource_id: str,
        description: str,
        details: Dict[str, Any] = None,
        level: AuditLevel = AuditLevel.MEDIUM,
        ip_address: str = "",
        user_agent: str = "",
        session_id: str = "",
        success: bool = True,
        error_message: str = None,
        tags: List[str] = None,
        metadata: Dict[str, Any] = None
    ) -> str:
        """Log an audit entry"""
        try:
            audit_id = str(uuid.uuid4())
            now = datetime.utcnow()
            
            audit_entry = AuditEntry(
                id=audit_id,
                timestamp=now,
                user_id=user_id,
                user_type=user_type,
                action=action,
                level=level,
                resource_type=resource_type,
                resource_id=resource_id,
                description=description,
                details=details or {},
                ip_address=ip_address,
                user_agent=user_agent,
                session_id=session_id,
                success=success,
                error_message=error_message,
                tags=tags or [],
                metadata=metadata or {}
            )
            
            # Store audit entry
            await self._store_audit_entry(audit_entry)
            
            # Store in time-based index for efficient querying
            await self._index_audit_entry(audit_entry)
            
            # Check for suspicious activity
            await self._check_suspicious_activity(audit_entry)
            
            logger.info(f"Audit entry logged: {audit_id}")
            return audit_id
            
        except Exception as e:
            logger.error(f"Audit logging error: {e}")
            raise
    
    async def get_audit_entries(
        self,
        filters: AuditFilter,
        limit: int = 100,
        offset: int = 0,
        sort_by: str = "timestamp",
        sort_order: str = "desc"
    ) -> List[AuditEntry]:
        """Get audit entries with filters"""
        try:
            # Build query based on filters
            query_keys = []
            
            if filters.user_id:
                query_keys.extend(self.redis_client.keys(f"audit_user:{filters.user_id}:*"))
            
            if filters.action:
                query_keys.extend(self.redis_client.keys(f"audit_action:{filters.action.value}:*"))
            
            if filters.level:
                query_keys.extend(self.redis_client.keys(f"audit_level:{filters.level.value}:*"))
            
            if filters.resource_type:
                query_keys.extend(self.redis_client.keys(f"audit_resource:{filters.resource_type}:*"))
            
            if filters.resource_id:
                query_keys.extend(self.redis_client.keys(f"audit_resource_id:{filters.resource_id}:*"))
            
            # If no specific filters, get all recent entries
            if not query_keys:
                query_keys = self.redis_client.keys("audit_entry:*")
            
            # Get unique audit entry IDs
            audit_ids = set()
            for key in query_keys:
                if key.startswith("audit_entry:"):
                    audit_ids.add(key.split(":")[1])
                else:
                    # Get audit IDs from index
                    audit_ids.update(self.redis_client.smembers(key))
            
            # Fetch audit entries
            audit_entries = []
            for audit_id in audit_ids:
                audit_entry = await self._get_audit_entry(audit_id)
                if audit_entry and self._matches_filters(audit_entry, filters):
                    audit_entries.append(audit_entry)
            
            # Sort entries
            reverse = sort_order == "desc"
            if sort_by == "timestamp":
                audit_entries.sort(key=lambda x: x.timestamp, reverse=reverse)
            elif sort_by == "level":
                audit_entries.sort(key=lambda x: x.level.value, reverse=reverse)
            elif sort_by == "action":
                audit_entries.sort(key=lambda x: x.action.value, reverse=reverse)
            
            # Apply pagination
            return audit_entries[offset:offset + limit]
            
        except Exception as e:
            logger.error(f"Get audit entries error: {e}")
            return []
    
    async def get_audit_entry(self, audit_id: str) -> Optional[AuditEntry]:
        """Get a specific audit entry"""
        return await self._get_audit_entry(audit_id)
    
    async def get_user_activity(
        self,
        user_id: str,
        days: int = 30,
        limit: int = 100
    ) -> List[AuditEntry]:
        """Get user activity for a specific period"""
        try:
            filters = AuditFilter(
                user_id=user_id,
                start_date=datetime.utcnow() - timedelta(days=days)
            )
            
            return await self.get_audit_entries(filters, limit=limit)
            
        except Exception as e:
            logger.error(f"Get user activity error: {e}")
            return []
    
    async def get_resource_activity(
        self,
        resource_type: str,
        resource_id: str,
        days: int = 30,
        limit: int = 100
    ) -> List[AuditEntry]:
        """Get activity for a specific resource"""
        try:
            filters = AuditFilter(
                resource_type=resource_type,
                resource_id=resource_id,
                start_date=datetime.utcnow() - timedelta(days=days)
            )
            
            return await self.get_audit_entries(filters, limit=limit)
            
        except Exception as e:
            logger.error(f"Get resource activity error: {e}")
            return []
    
    async def get_audit_stats(
        self,
        days: int = 30,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get audit statistics"""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            filters = AuditFilter(start_date=start_date, user_id=user_id)
            
            entries = await self.get_audit_entries(filters, limit=10000)
            
            # Calculate statistics
            total_entries = len(entries)
            successful_entries = len([e for e in entries if e.success])
            failed_entries = total_entries - successful_entries
            
            # Group by action
            action_counts = {}
            for entry in entries:
                action = entry.action.value
                action_counts[action] = action_counts.get(action, 0) + 1
            
            # Group by level
            level_counts = {}
            for entry in entries:
                level = entry.level.value
                level_counts[level] = level_counts.get(level, 0) + 1
            
            # Group by user
            user_counts = {}
            for entry in entries:
                user = entry.user_id
                user_counts[user] = user_counts.get(user, 0) + 1
            
            # Most active users
            most_active_users = sorted(
                user_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10]
            
            # Most common actions
            most_common_actions = sorted(
                action_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:10]
            
            return {
                'total_entries': total_entries,
                'successful_entries': successful_entries,
                'failed_entries': failed_entries,
                'success_rate': round((successful_entries / total_entries * 100), 2) if total_entries > 0 else 0,
                'action_counts': action_counts,
                'level_counts': level_counts,
                'most_active_users': most_active_users,
                'most_common_actions': most_common_actions,
                'period_days': days
            }
            
        except Exception as e:
            logger.error(f"Get audit stats error: {e}")
            return {}
    
    async def export_audit_log(
        self,
        filters: AuditFilter,
        format: str = "json"
    ) -> bytes:
        """Export audit log in specified format"""
        try:
            entries = await self.get_audit_entries(filters, limit=10000)
            
            if format == "json":
                data = [asdict(entry) for entry in entries]
                return json.dumps(data, indent=2, default=str).encode('utf-8')
            
            elif format == "csv":
                import csv
                import io
                
                buffer = io.StringIO()
                writer = csv.writer(buffer)
                
                # Write header
                writer.writerow([
                    'ID', 'Timestamp', 'User ID', 'User Type', 'Action', 'Level',
                    'Resource Type', 'Resource ID', 'Description', 'Success',
                    'IP Address', 'User Agent', 'Session ID', 'Error Message'
                ])
                
                # Write data
                for entry in entries:
                    writer.writerow([
                        entry.id,
                        entry.timestamp.isoformat(),
                        entry.user_id,
                        entry.user_type,
                        entry.action.value,
                        entry.level.value,
                        entry.resource_type,
                        entry.resource_id,
                        entry.description,
                        entry.success,
                        entry.ip_address,
                        entry.user_agent,
                        entry.session_id,
                        entry.error_message or ""
                    ])
                
                return buffer.getvalue().encode('utf-8')
            
            else:
                raise ValueError(f"Unsupported format: {format}")
                
        except Exception as e:
            logger.error(f"Export audit log error: {e}")
            raise
    
    async def cleanup_old_audit_entries(self) -> int:
        """Clean up old audit entries based on retention policy"""
        try:
            now = datetime.utcnow()
            regular_cutoff = now - timedelta(days=self.audit_retention_days)
            critical_cutoff = now - timedelta(days=self.critical_retention_days)
            
            cleaned_count = 0
            
            # Get all audit entries
            pattern = "audit_entry:*"
            keys = self.redis_client.keys(pattern)
            
            for key in keys:
                audit_entry = await self._get_audit_entry(key.split(":")[1])
                if audit_entry:
                    should_delete = False
                    
                    if audit_entry.level == AuditLevel.CRITICAL:
                        if audit_entry.timestamp < critical_cutoff:
                            should_delete = True
                    else:
                        if audit_entry.timestamp < regular_cutoff:
                            should_delete = True
                    
                    if should_delete:
                        await self._delete_audit_entry(audit_entry.id)
                        cleaned_count += 1
            
            logger.info(f"Cleaned up {cleaned_count} old audit entries")
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Cleanup old audit entries error: {e}")
            return 0
    
    async def _store_audit_entry(self, audit_entry: AuditEntry):
        """Store audit entry in Redis"""
        key = f"audit_entry:{audit_entry.id}"
        data = json.dumps(asdict(audit_entry), default=str)
        self.redis_client.set(key, data, ex=86400 * self.audit_retention_days)
    
    async def _get_audit_entry(self, audit_id: str) -> Optional[AuditEntry]:
        """Get audit entry from Redis"""
        key = f"audit_entry:{audit_id}"
        data = self.redis_client.get(key)
        if data:
            entry_dict = json.loads(data)
            return AuditEntry(**entry_dict)
        return None
    
    async def _delete_audit_entry(self, audit_id: str):
        """Delete audit entry from Redis"""
        key = f"audit_entry:{audit_id}"
        self.redis_client.delete(key)
        
        # Also delete from indexes
        pattern = f"*:{audit_id}"
        index_keys = self.redis_client.keys(pattern)
        for index_key in index_keys:
            self.redis_client.delete(index_key)
    
    async def _index_audit_entry(self, audit_entry: AuditEntry):
        """Index audit entry for efficient querying"""
        try:
            # Index by user
            user_key = f"audit_user:{audit_entry.user_id}:{audit_entry.id}"
            self.redis_client.set(user_key, audit_entry.id, ex=86400 * self.audit_retention_days)
            
            # Index by action
            action_key = f"audit_action:{audit_entry.action.value}:{audit_entry.id}"
            self.redis_client.set(action_key, audit_entry.id, ex=86400 * self.audit_retention_days)
            
            # Index by level
            level_key = f"audit_level:{audit_entry.level.value}:{audit_entry.id}"
            self.redis_client.set(level_key, audit_entry.id, ex=86400 * self.audit_retention_days)
            
            # Index by resource type
            resource_key = f"audit_resource:{audit_entry.resource_type}:{audit_entry.id}"
            self.redis_client.set(resource_key, audit_entry.id, ex=86400 * self.audit_retention_days)
            
            # Index by resource ID
            resource_id_key = f"audit_resource_id:{audit_entry.resource_id}:{audit_entry.id}"
            self.redis_client.set(resource_id_key, audit_entry.id, ex=86400 * self.audit_retention_days)
            
            # Index by timestamp (for time-based queries)
            timestamp_key = f"audit_timestamp:{audit_entry.timestamp.strftime('%Y-%m-%d')}:{audit_entry.id}"
            self.redis_client.set(timestamp_key, audit_entry.id, ex=86400 * self.audit_retention_days)
            
        except Exception as e:
            logger.error(f"Index audit entry error: {e}")
    
    def _matches_filters(self, audit_entry: AuditEntry, filters: AuditFilter) -> bool:
        """Check if audit entry matches filters"""
        if filters.user_id and audit_entry.user_id != filters.user_id:
            return False
        
        if filters.user_type and audit_entry.user_type != filters.user_type:
            return False
        
        if filters.action and audit_entry.action != filters.action:
            return False
        
        if filters.level and audit_entry.level != filters.level:
            return False
        
        if filters.resource_type and audit_entry.resource_type != filters.resource_type:
            return False
        
        if filters.resource_id and audit_entry.resource_id != filters.resource_id:
            return False
        
        if filters.start_date and audit_entry.timestamp < filters.start_date:
            return False
        
        if filters.end_date and audit_entry.timestamp > filters.end_date:
            return False
        
        if filters.success is not None and audit_entry.success != filters.success:
            return False
        
        if filters.tags:
            if not any(tag in audit_entry.tags for tag in filters.tags):
                return False
        
        return True
    
    async def _check_suspicious_activity(self, audit_entry: AuditEntry):
        """Check for suspicious activity patterns"""
        try:
            # Check for multiple failed login attempts
            if audit_entry.action == AuditAction.USER_LOGIN and not audit_entry.success:
                recent_failures = await self.get_audit_entries(
                    AuditFilter(
                        user_id=audit_entry.user_id,
                        action=AuditAction.USER_LOGIN,
                        success=False,
                        start_date=datetime.utcnow() - timedelta(minutes=15)
                    ),
                    limit=10
                )
                
                if len(recent_failures) >= 5:
                    await self.log_activity(
                        user_id="system",
                        user_type="system",
                        action=AuditAction.SUSPICIOUS_ACTIVITY,
                        resource_type="user",
                        resource_id=audit_entry.user_id,
                        description=f"Multiple failed login attempts detected for user {audit_entry.user_id}",
                        details={
                            "failed_attempts": len(recent_failures),
                            "time_window": "15 minutes",
                            "ip_address": audit_entry.ip_address
                        },
                        level=AuditLevel.HIGH,
                        ip_address=audit_entry.ip_address,
                        user_agent=audit_entry.user_agent,
                        session_id=audit_entry.session_id
                    )
            
            # Check for unusual access patterns
            if audit_entry.action in [AuditAction.REPORT_DOWNLOADED, AuditAction.DATA_EXPORTED]:
                recent_access = await self.get_audit_entries(
                    AuditFilter(
                        user_id=audit_entry.user_id,
                        action=audit_entry.action,
                        start_date=datetime.utcnow() - timedelta(hours=1)
                    ),
                    limit=20
                )
                
                if len(recent_access) >= 10:
                    await self.log_activity(
                        user_id="system",
                        user_type="system",
                        action=AuditAction.SUSPICIOUS_ACTIVITY,
                        resource_type="user",
                        resource_id=audit_entry.user_id,
                        description=f"Unusual access pattern detected for user {audit_entry.user_id}",
                        details={
                            "action": audit_entry.action.value,
                            "access_count": len(recent_access),
                            "time_window": "1 hour"
                        },
                        level=AuditLevel.MEDIUM,
                        ip_address=audit_entry.ip_address,
                        user_agent=audit_entry.user_agent,
                        session_id=audit_entry.session_id
                    )
                    
        except Exception as e:
            logger.error(f"Check suspicious activity error: {e}")
