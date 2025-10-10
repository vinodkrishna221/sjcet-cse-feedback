"""
Storage service for report files and data
"""
import os
import json
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, BinaryIO
from pathlib import Path
import boto3
from botocore.exceptions import ClientError
import redis
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class StorageType(Enum):
    LOCAL = "local"
    S3 = "s3"
    MINIO = "minio"

class FileType(Enum):
    PDF = "pdf"
    EXCEL = "xlsx"
    CSV = "csv"
    JSON = "json"
    IMAGE = "image"

@dataclass
class StorageConfig:
    storage_type: StorageType
    bucket_name: str
    region: str = "us-east-1"
    access_key: Optional[str] = None
    secret_key: Optional[str] = None
    endpoint_url: Optional[str] = None
    local_path: str = "./storage"

@dataclass
class FileMetadata:
    file_id: str
    filename: str
    file_type: FileType
    size: int
    content_type: str
    checksum: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    tags: Dict[str, str] = None
    access_count: int = 0
    last_accessed: Optional[datetime] = None

class StorageService:
    """Service for managing file storage and metadata"""
    
    def __init__(self, config: StorageConfig):
        self.config = config
        self.redis_client = redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379'))
        
        # Initialize storage client based on type
        if config.storage_type == StorageType.S3:
            self.client = boto3.client(
                's3',
                aws_access_key_id=config.access_key,
                aws_secret_access_key=config.secret_key,
                region_name=config.region
            )
        elif config.storage_type == StorageType.MINIO:
            self.client = boto3.client(
                's3',
                endpoint_url=config.endpoint_url,
                aws_access_key_id=config.access_key,
                aws_secret_access_key=config.secret_key,
                region_name=config.region
            )
        else:
            self.client = None
            # Ensure local storage directory exists
            Path(config.local_path).mkdir(parents=True, exist_ok=True)
    
    async def upload_file(
        self,
        file_data: bytes,
        filename: str,
        file_type: FileType,
        content_type: str,
        tags: Optional[Dict[str, str]] = None,
        expires_in_days: Optional[int] = None
    ) -> FileMetadata:
        """Upload a file to storage"""
        try:
            # Generate file ID and path
            file_id = self._generate_file_id(filename, file_data)
            file_path = self._get_file_path(file_id, file_type)
            
            # Calculate checksum
            checksum = hashlib.md5(file_data).hexdigest()
            
            # Set expiration
            expires_at = None
            if expires_in_days:
                expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
            
            # Upload file
            if self.config.storage_type == StorageType.LOCAL:
                await self._upload_local(file_path, file_data)
            else:
                await self._upload_s3(file_path, file_data, content_type, tags)
            
            # Create metadata
            metadata = FileMetadata(
                file_id=file_id,
                filename=filename,
                file_type=file_type,
                size=len(file_data),
                content_type=content_type,
                checksum=checksum,
                created_at=datetime.utcnow(),
                expires_at=expires_at,
                tags=tags or {}
            )
            
            # Store metadata
            await self._store_metadata(metadata)
            
            logger.info(f"File uploaded successfully: {file_id}")
            return metadata
            
        except Exception as e:
            logger.error(f"File upload error: {e}")
            raise
    
    async def download_file(self, file_id: str) -> bytes:
        """Download a file from storage"""
        try:
            # Get metadata
            metadata = await self._get_metadata(file_id)
            if not metadata:
                raise FileNotFoundError(f"File not found: {file_id}")
            
            # Check if file has expired
            if metadata.expires_at and metadata.expires_at < datetime.utcnow():
                raise FileNotFoundError(f"File has expired: {file_id}")
            
            # Update access statistics
            await self._update_access_stats(file_id)
            
            # Download file
            file_path = self._get_file_path(file_id, metadata.file_type)
            
            if self.config.storage_type == StorageType.LOCAL:
                return await self._download_local(file_path)
            else:
                return await self._download_s3(file_path)
                
        except Exception as e:
            logger.error(f"File download error: {e}")
            raise
    
    async def delete_file(self, file_id: str) -> bool:
        """Delete a file from storage"""
        try:
            # Get metadata
            metadata = await self._get_metadata(file_id)
            if not metadata:
                return False
            
            # Delete file
            file_path = self._get_file_path(file_id, metadata.file_type)
            
            if self.config.storage_type == StorageType.LOCAL:
                await self._delete_local(file_path)
            else:
                await self._delete_s3(file_path)
            
            # Delete metadata
            await self._delete_metadata(file_id)
            
            logger.info(f"File deleted successfully: {file_id}")
            return True
            
        except Exception as e:
            logger.error(f"File deletion error: {e}")
            return False
    
    async def get_file_metadata(self, file_id: str) -> Optional[FileMetadata]:
        """Get file metadata"""
        return await self._get_metadata(file_id)
    
    async def list_files(
        self,
        file_type: Optional[FileType] = None,
        tags: Optional[Dict[str, str]] = None,
        created_after: Optional[datetime] = None,
        created_before: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[FileMetadata]:
        """List files with filters"""
        try:
            # Get all file IDs from Redis
            pattern = f"file_metadata:*"
            keys = self.redis_client.keys(pattern)
            
            files = []
            for key in keys:
                metadata_data = self.redis_client.get(key)
                if metadata_data:
                    metadata = FileMetadata(**json.loads(metadata_data))
                    
                    # Apply filters
                    if file_type and metadata.file_type != file_type:
                        continue
                    if created_after and metadata.created_at < created_after:
                        continue
                    if created_before and metadata.created_at > created_before:
                        continue
                    if tags:
                        if not all(metadata.tags.get(k) == v for k, v in tags.items()):
                            continue
                    
                    files.append(metadata)
            
            # Sort by created_at descending
            files.sort(key=lambda x: x.created_at, reverse=True)
            
            # Apply pagination
            return files[offset:offset + limit]
            
        except Exception as e:
            logger.error(f"List files error: {e}")
            return []
    
    async def cleanup_expired_files(self) -> int:
        """Clean up expired files"""
        try:
            expired_files = []
            pattern = f"file_metadata:*"
            keys = self.redis_client.keys(pattern)
            
            for key in keys:
                metadata_data = self.redis_client.get(key)
                if metadata_data:
                    metadata = FileMetadata(**json.loads(metadata_data))
                    if metadata.expires_at and metadata.expires_at < datetime.utcnow():
                        expired_files.append(metadata.file_id)
            
            # Delete expired files
            deleted_count = 0
            for file_id in expired_files:
                if await self.delete_file(file_id):
                    deleted_count += 1
            
            logger.info(f"Cleaned up {deleted_count} expired files")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Cleanup expired files error: {e}")
            return 0
    
    async def archive_old_files(self, days_old: int = 30) -> int:
        """Archive old files to cold storage"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            old_files = await self.list_files(created_before=cutoff_date)
            
            archived_count = 0
            for file_metadata in old_files:
                # Add archive tag
                file_metadata.tags['archived'] = 'true'
                file_metadata.tags['archived_at'] = datetime.utcnow().isoformat()
                
                # Update metadata
                await self._store_metadata(file_metadata)
                archived_count += 1
            
            logger.info(f"Archived {archived_count} old files")
            return archived_count
            
        except Exception as e:
            logger.error(f"Archive old files error: {e}")
            return 0
    
    async def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        try:
            pattern = f"file_metadata:*"
            keys = self.redis_client.keys(pattern)
            
            total_files = len(keys)
            total_size = 0
            file_types = {}
            access_counts = []
            
            for key in keys:
                metadata_data = self.redis_client.get(key)
                if metadata_data:
                    metadata = FileMetadata(**json.loads(metadata_data))
                    total_size += metadata.size
                    
                    file_type = metadata.file_type.value
                    file_types[file_type] = file_types.get(file_type, 0) + 1
                    
                    access_counts.append(metadata.access_count)
            
            return {
                'total_files': total_files,
                'total_size': total_size,
                'total_size_mb': round(total_size / (1024 * 1024), 2),
                'file_types': file_types,
                'average_access_count': round(sum(access_counts) / len(access_counts), 2) if access_counts else 0,
                'most_accessed': max(access_counts) if access_counts else 0
            }
            
        except Exception as e:
            logger.error(f"Get storage stats error: {e}")
            return {}
    
    def _generate_file_id(self, filename: str, file_data: bytes) -> str:
        """Generate unique file ID"""
        content_hash = hashlib.sha256(file_data).hexdigest()[:16]
        timestamp = int(datetime.utcnow().timestamp())
        return f"{timestamp}_{content_hash}"
    
    def _get_file_path(self, file_id: str, file_type: FileType) -> str:
        """Get file path for storage"""
        if self.config.storage_type == StorageType.LOCAL:
            return os.path.join(self.config.local_path, f"{file_id}.{file_type.value}")
        else:
            return f"reports/{file_type.value}/{file_id}.{file_type.value}"
    
    async def _upload_local(self, file_path: str, file_data: bytes):
        """Upload file to local storage"""
        with open(file_path, 'wb') as f:
            f.write(file_data)
    
    async def _upload_s3(self, file_path: str, file_data: bytes, content_type: str, tags: Optional[Dict[str, str]]):
        """Upload file to S3/MinIO"""
        try:
            extra_args = {
                'ContentType': content_type,
                'ServerSideEncryption': 'AES256'
            }
            
            if tags:
                extra_args['Tagging'] = '&'.join([f"{k}={v}" for k, v in tags.items()])
            
            self.client.put_object(
                Bucket=self.config.bucket_name,
                Key=file_path,
                Body=file_data,
                **extra_args
            )
        except ClientError as e:
            logger.error(f"S3 upload error: {e}")
            raise
    
    async def _download_local(self, file_path: str) -> bytes:
        """Download file from local storage"""
        with open(file_path, 'rb') as f:
            return f.read()
    
    async def _download_s3(self, file_path: str) -> bytes:
        """Download file from S3/MinIO"""
        try:
            response = self.client.get_object(
                Bucket=self.config.bucket_name,
                Key=file_path
            )
            return response['Body'].read()
        except ClientError as e:
            logger.error(f"S3 download error: {e}")
            raise
    
    async def _delete_local(self, file_path: str):
        """Delete file from local storage"""
        if os.path.exists(file_path):
            os.remove(file_path)
    
    async def _delete_s3(self, file_path: str):
        """Delete file from S3/MinIO"""
        try:
            self.client.delete_object(
                Bucket=self.config.bucket_name,
                Key=file_path
            )
        except ClientError as e:
            logger.error(f"S3 delete error: {e}")
            raise
    
    async def _store_metadata(self, metadata: FileMetadata):
        """Store file metadata in Redis"""
        key = f"file_metadata:{metadata.file_id}"
        data = json.dumps(metadata.__dict__, default=str)
        self.redis_client.set(key, data, ex=86400 * 30)  # 30 days TTL
    
    async def _get_metadata(self, file_id: str) -> Optional[FileMetadata]:
        """Get file metadata from Redis"""
        key = f"file_metadata:{file_id}"
        data = self.redis_client.get(key)
        if data:
            return FileMetadata(**json.loads(data))
        return None
    
    async def _delete_metadata(self, file_id: str):
        """Delete file metadata from Redis"""
        key = f"file_metadata:{file_id}"
        self.redis_client.delete(key)
    
    async def _update_access_stats(self, file_id: str):
        """Update file access statistics"""
        metadata = await self._get_metadata(file_id)
        if metadata:
            metadata.access_count += 1
            metadata.last_accessed = datetime.utcnow()
            await self._store_metadata(metadata)
