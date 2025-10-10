"""
Report sharing and collaboration system
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum
import json
import redis
import uuid
import hashlib
import secrets

logger = logging.getLogger(__name__)

class ShareType(Enum):
    VIEW = "view"
    COMMENT = "comment"
    EDIT = "edit"
    ADMIN = "admin"

class ShareStatus(Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"

@dataclass
class SharePermission:
    id: str
    report_id: str
    user_id: str
    share_type: ShareType
    granted_by: str
    granted_at: datetime
    expires_at: Optional[datetime] = None
    status: ShareStatus = ShareStatus.ACTIVE
    notes: str = ""

@dataclass
class ShareLink:
    id: str
    report_id: str
    token: str
    share_type: ShareType
    created_by: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    password: Optional[str] = None
    max_uses: Optional[int] = None
    use_count: int = 0
    status: ShareStatus = ShareStatus.ACTIVE
    allowed_emails: List[str] = None
    allowed_domains: List[str] = None

@dataclass
class ShareActivity:
    id: str
    report_id: str
    user_id: str
    action: str
    timestamp: datetime
    details: Dict[str, Any] = None

class ReportSharingManager:
    """Manager for report sharing and collaboration"""
    
    def __init__(self, redis_url: str = None):
        self.redis_client = redis.from_url(redis_url or os.environ.get('REDIS_URL', 'redis://localhost:6379'))
    
    async def create_share_permission(
        self,
        report_id: str,
        user_id: str,
        share_type: ShareType,
        granted_by: str,
        expires_at: Optional[datetime] = None,
        notes: str = ""
    ) -> str:
        """Create a share permission for a specific user"""
        try:
            permission_id = str(uuid.uuid4())
            now = datetime.utcnow()
            
            permission = SharePermission(
                id=permission_id,
                report_id=report_id,
                user_id=user_id,
                share_type=share_type,
                granted_by=granted_by,
                granted_at=now,
                expires_at=expires_at,
                notes=notes
            )
            
            # Store permission
            await self._store_permission(permission)
            
            # Log activity
            await self._log_activity(
                report_id,
                granted_by,
                "permission_granted",
                {
                    "permission_id": permission_id,
                    "user_id": user_id,
                    "share_type": share_type.value,
                    "expires_at": expires_at.isoformat() if expires_at else None
                }
            )
            
            logger.info(f"Share permission created: {permission_id}")
            return permission_id
            
        except Exception as e:
            logger.error(f"Share permission creation error: {e}")
            raise
    
    async def create_share_link(
        self,
        report_id: str,
        share_type: ShareType,
        created_by: str,
        expires_at: Optional[datetime] = None,
        password: Optional[str] = None,
        max_uses: Optional[int] = None,
        allowed_emails: List[str] = None,
        allowed_domains: List[str] = None
    ) -> str:
        """Create a shareable link for a report"""
        try:
            link_id = str(uuid.uuid4())
            token = self._generate_share_token()
            now = datetime.utcnow()
            
            share_link = ShareLink(
                id=link_id,
                report_id=report_id,
                token=token,
                share_type=share_type,
                created_by=created_by,
                created_at=now,
                expires_at=expires_at,
                password=password,
                max_uses=max_uses,
                allowed_emails=allowed_emails or [],
                allowed_domains=allowed_domains or []
            )
            
            # Store share link
            await self._store_share_link(share_link)
            
            # Log activity
            await self._log_activity(
                report_id,
                created_by,
                "share_link_created",
                {
                    "link_id": link_id,
                    "share_type": share_type.value,
                    "expires_at": expires_at.isoformat() if expires_at else None,
                    "has_password": bool(password),
                    "max_uses": max_uses
                }
            )
            
            logger.info(f"Share link created: {link_id}")
            return link_id
            
        except Exception as e:
            logger.error(f"Share link creation error: {e}")
            raise
    
    async def get_share_link(self, token: str) -> Optional[ShareLink]:
        """Get share link by token"""
        try:
            key = f"share_link:{token}"
            link_data = self.redis_client.get(key)
            if link_data:
                link_dict = json.loads(link_data)
                return ShareLink(**link_dict)
            return None
            
        except Exception as e:
            logger.error(f"Get share link error: {e}")
            return None
    
    async def validate_share_access(
        self,
        report_id: str,
        user_id: str,
        token: Optional[str] = None,
        password: Optional[str] = None
    ) -> Optional[ShareType]:
        """Validate if user has access to a shared report"""
        try:
            # Check direct permissions first
            permission = await self._get_user_permission(report_id, user_id)
            if permission and permission.status == ShareStatus.ACTIVE:
                if not permission.expires_at or permission.expires_at > datetime.utcnow():
                    return permission.share_type
            
            # Check share link if token provided
            if token:
                share_link = await self.get_share_link(token)
                if share_link and share_link.status == ShareStatus.ACTIVE:
                    # Check expiration
                    if share_link.expires_at and share_link.expires_at <= datetime.utcnow():
                        return None
                    
                    # Check max uses
                    if share_link.max_uses and share_link.use_count >= share_link.max_uses:
                        return None
                    
                    # Check password
                    if share_link.password and share_link.password != password:
                        return None
                    
                    # Check email restrictions
                    if share_link.allowed_emails:
                        # This would need user email lookup
                        pass
                    
                    # Check domain restrictions
                    if share_link.allowed_domains:
                        # This would need user email domain lookup
                        pass
                    
                    # Increment use count
                    share_link.use_count += 1
                    await self._store_share_link(share_link)
                    
                    return share_link.share_type
            
            return None
            
        except Exception as e:
            logger.error(f"Validate share access error: {e}")
            return None
    
    async def revoke_permission(self, permission_id: str, revoked_by: str) -> bool:
        """Revoke a share permission"""
        try:
            permission = await self._get_permission(permission_id)
            if not permission:
                return False
            
            permission.status = ShareStatus.REVOKED
            await self._store_permission(permission)
            
            # Log activity
            await self._log_activity(
                permission.report_id,
                revoked_by,
                "permission_revoked",
                {
                    "permission_id": permission_id,
                    "user_id": permission.user_id,
                    "share_type": permission.share_type.value
                }
            )
            
            logger.info(f"Permission revoked: {permission_id}")
            return True
            
        except Exception as e:
            logger.error(f"Revoke permission error: {e}")
            return False
    
    async def revoke_share_link(self, link_id: str, revoked_by: str) -> bool:
        """Revoke a share link"""
        try:
            share_link = await self._get_share_link_by_id(link_id)
            if not share_link:
                return False
            
            share_link.status = ShareStatus.REVOKED
            await self._store_share_link(share_link)
            
            # Log activity
            await self._log_activity(
                share_link.report_id,
                revoked_by,
                "share_link_revoked",
                {
                    "link_id": link_id,
                    "share_type": share_link.share_type.value
                }
            )
            
            logger.info(f"Share link revoked: {link_id}")
            return True
            
        except Exception as e:
            logger.error(f"Revoke share link error: {e}")
            return False
    
    async def get_report_permissions(self, report_id: str) -> List[SharePermission]:
        """Get all permissions for a report"""
        try:
            pattern = f"share_permission:{report_id}:*"
            keys = self.redis_client.keys(pattern)
            
            permissions = []
            for key in keys:
                permission_data = self.redis_client.get(key)
                if permission_data:
                    permission_dict = json.loads(permission_data)
                    permission = SharePermission(**permission_dict)
                    permissions.append(permission)
            
            return permissions
            
        except Exception as e:
            logger.error(f"Get report permissions error: {e}")
            return []
    
    async def get_report_share_links(self, report_id: str) -> List[ShareLink]:
        """Get all share links for a report"""
        try:
            pattern = f"report_share_links:{report_id}:*"
            keys = self.redis_client.keys(pattern)
            
            share_links = []
            for key in keys:
                link_data = self.redis_client.get(key)
                if link_data:
                    link_dict = json.loads(link_data)
                    share_link = ShareLink(**link_dict)
                    share_links.append(share_link)
            
            return share_links
            
        except Exception as e:
            logger.error(f"Get report share links error: {e}")
            return []
    
    async def get_share_activity(self, report_id: str, limit: int = 50) -> List[ShareActivity]:
        """Get sharing activity for a report"""
        try:
            pattern = f"share_activity:{report_id}:*"
            keys = self.redis_client.keys(pattern)
            
            activities = []
            for key in keys:
                activity_data = self.redis_client.get(key)
                if activity_data:
                    activity_dict = json.loads(activity_data)
                    activity = ShareActivity(**activity_dict)
                    activities.append(activity)
            
            # Sort by timestamp descending
            activities.sort(key=lambda x: x.timestamp, reverse=True)
            
            return activities[:limit]
            
        except Exception as e:
            logger.error(f"Get share activity error: {e}")
            return []
    
    async def get_user_shared_reports(self, user_id: str) -> List[Dict[str, Any]]:
        """Get reports shared with a user"""
        try:
            # Get user's permissions
            pattern = f"user_permissions:{user_id}:*"
            keys = self.redis_client.keys(pattern)
            
            shared_reports = []
            for key in keys:
                permission_data = self.redis_client.get(key)
                if permission_data:
                    permission_dict = json.loads(permission_data)
                    permission = SharePermission(**permission_dict)
                    
                    if permission.status == ShareStatus.ACTIVE:
                        shared_reports.append({
                            "report_id": permission.report_id,
                            "share_type": permission.share_type.value,
                            "granted_at": permission.granted_at,
                            "expires_at": permission.expires_at,
                            "granted_by": permission.granted_by
                        })
            
            return shared_reports
            
        except Exception as e:
            logger.error(f"Get user shared reports error: {e}")
            return []
    
    async def cleanup_expired_shares(self) -> int:
        """Clean up expired shares and permissions"""
        try:
            cleaned_count = 0
            now = datetime.utcnow()
            
            # Clean up expired permissions
            pattern = "share_permission:*"
            keys = self.redis_client.keys(pattern)
            
            for key in keys:
                permission_data = self.redis_client.get(key)
                if permission_data:
                    permission_dict = json.loads(permission_data)
                    permission = SharePermission(**permission_dict)
                    
                    if (permission.expires_at and 
                        permission.expires_at <= now and 
                        permission.status == ShareStatus.ACTIVE):
                        
                        permission.status = ShareStatus.EXPIRED
                        await self._store_permission(permission)
                        cleaned_count += 1
            
            # Clean up expired share links
            pattern = "share_link:*"
            keys = self.redis_client.keys(pattern)
            
            for key in keys:
                link_data = self.redis_client.get(key)
                if link_data:
                    link_dict = json.loads(link_data)
                    share_link = ShareLink(**link_dict)
                    
                    if (share_link.expires_at and 
                        share_link.expires_at <= now and 
                        share_link.status == ShareStatus.ACTIVE):
                        
                        share_link.status = ShareStatus.EXPIRED
                        await self._store_share_link(share_link)
                        cleaned_count += 1
            
            logger.info(f"Cleaned up {cleaned_count} expired shares")
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Cleanup expired shares error: {e}")
            return 0
    
    def _generate_share_token(self) -> str:
        """Generate a secure share token"""
        return secrets.token_urlsafe(32)
    
    async def _store_permission(self, permission: SharePermission):
        """Store permission in Redis"""
        key = f"share_permission:{permission.report_id}:{permission.id}"
        data = json.dumps(permission.__dict__, default=str)
        self.redis_client.set(key, data, ex=86400 * 30)  # 30 days TTL
        
        # Also store by user for quick lookup
        user_key = f"user_permissions:{permission.user_id}:{permission.id}"
        self.redis_client.set(user_key, data, ex=86400 * 30)
    
    async def _get_permission(self, permission_id: str) -> Optional[SharePermission]:
        """Get permission by ID"""
        pattern = f"share_permission:*:{permission_id}"
        keys = self.redis_client.keys(pattern)
        
        if keys:
            permission_data = self.redis_client.get(keys[0])
            if permission_data:
                permission_dict = json.loads(permission_data)
                return SharePermission(**permission_dict)
        
        return None
    
    async def _get_user_permission(self, report_id: str, user_id: str) -> Optional[SharePermission]:
        """Get user's permission for a report"""
        pattern = f"user_permissions:{user_id}:*"
        keys = self.redis_client.keys(pattern)
        
        for key in keys:
            permission_data = self.redis_client.get(key)
            if permission_data:
                permission_dict = json.loads(permission_data)
                permission = SharePermission(**permission_dict)
                
                if permission.report_id == report_id:
                    return permission
        
        return None
    
    async def _store_share_link(self, share_link: ShareLink):
        """Store share link in Redis"""
        # Store by token
        token_key = f"share_link:{share_link.token}"
        data = json.dumps(share_link.__dict__, default=str)
        self.redis_client.set(token_key, data, ex=86400 * 30)  # 30 days TTL
        
        # Store by report ID
        report_key = f"report_share_links:{share_link.report_id}:{share_link.id}"
        self.redis_client.set(report_key, data, ex=86400 * 30)
    
    async def _get_share_link_by_id(self, link_id: str) -> Optional[ShareLink]:
        """Get share link by ID"""
        pattern = f"report_share_links:*:{link_id}"
        keys = self.redis_client.keys(pattern)
        
        if keys:
            link_data = self.redis_client.get(keys[0])
            if link_data:
                link_dict = json.loads(link_data)
                return ShareLink(**link_dict)
        
        return None
    
    async def _log_activity(
        self,
        report_id: str,
        user_id: str,
        action: str,
        details: Dict[str, Any] = None
    ):
        """Log sharing activity"""
        try:
            activity_id = str(uuid.uuid4())
            activity = ShareActivity(
                id=activity_id,
                report_id=report_id,
                user_id=user_id,
                action=action,
                timestamp=datetime.utcnow(),
                details=details or {}
            )
            
            key = f"share_activity:{report_id}:{activity_id}"
            data = json.dumps(activity.__dict__, default=str)
            self.redis_client.set(key, data, ex=86400 * 7)  # 7 days TTL
            
        except Exception as e:
            logger.error(f"Log activity error: {e}")
