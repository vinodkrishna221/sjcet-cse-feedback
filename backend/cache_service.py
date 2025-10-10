"""
Redis caching service for performance optimization
"""
import json
import pickle
from typing import Any, Optional, Union, Dict, List
from datetime import datetime, timedelta
import asyncio
import logging
from functools import wraps

import redis.asyncio as redis
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class CacheService:
    """Redis-based caching service with advanced features"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis_client: Optional[redis.Redis] = None
        self._connection_pool = None
        
    async def connect(self):
        """Initialize Redis connection with connection pooling"""
        try:
            self._connection_pool = redis.ConnectionPool.from_url(
                self.redis_url,
                max_connections=20,
                retry_on_timeout=True,
                socket_keepalive=True,
                socket_keepalive_options={}
            )
            self.redis_client = redis.Redis(connection_pool=self._connection_pool)
            await self.redis_client.ping()
            logger.info("Redis connection established successfully")
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}. Continuing without cache.")
            self.redis_client = None
            # Don't raise - allow application to continue without Redis
    
    def is_connected(self) -> bool:
        """Check if Redis is connected"""
        return self.redis_client is not None
    
    async def disconnect(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
        if self._connection_pool:
            await self._connection_pool.disconnect()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.is_connected():
            return None
            
        try:
            value = await self.redis_client.get(key)
            if value is None:
                return None
            
            # Try to deserialize as JSON first, then pickle
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return pickle.loads(value)
        except Exception as e:
            logger.error(f"Error getting cache key {key}: {e}")
            return None
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        expire: Optional[int] = None,
        serialize_method: str = "json"
    ) -> bool:
        """Set value in cache with optional expiration"""
        if not self.is_connected():
            return True
            
        try:
            # Serialize value
            if serialize_method == "json":
                serialized_value = json.dumps(value, default=str)
            else:
                serialized_value = pickle.dumps(value)
            
            # Set with expiration
            if expire:
                await self.redis_client.setex(key, expire, serialized_value)
            else:
                await self.redis_client.set(key, serialized_value)
            
            return True
        except Exception as e:
            logger.error(f"Error setting cache key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.is_connected():
            return True
            
        try:
            result = await self.redis_client.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Error deleting cache key {key}: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        try:
            if not self.redis_client:
                return 0
            
            keys = await self.redis_client.keys(pattern)
            if keys:
                return await self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Error deleting pattern {pattern}: {e}")
            return 0
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            if not self.redis_client:
                return False
            
            return await self.redis_client.exists(key) > 0
        except Exception as e:
            logger.error(f"Error checking existence of key {key}: {e}")
            return False
    
    async def get_or_set(
        self, 
        key: str, 
        func, 
        expire: Optional[int] = None,
        *args, 
        **kwargs
    ) -> Any:
        """Get value from cache or compute and cache it"""
        try:
            # Try to get from cache first
            cached_value = await self.get(key)
            if cached_value is not None:
                return cached_value
            
            # Compute value if not in cache
            if asyncio.iscoroutinefunction(func):
                value = await func(*args, **kwargs)
            else:
                value = func(*args, **kwargs)
            
            # Cache the computed value
            await self.set(key, value, expire)
            return value
        except Exception as e:
            logger.error(f"Error in get_or_set for key {key}: {e}")
            # Fallback to computing without caching
            if asyncio.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            else:
                return func(*args, **kwargs)
    
    async def increment(self, key: str, amount: int = 1, expire: Optional[int] = None) -> int:
        """Increment counter in cache"""
        try:
            if not self.redis_client:
                return 0
            
            result = await self.redis_client.incrby(key, amount)
            if expire and result == amount:  # First increment, set expiration
                await self.redis_client.expire(key, expire)
            return result
        except Exception as e:
            logger.error(f"Error incrementing key {key}: {e}")
            return 0
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get Redis cache statistics"""
        try:
            if not self.redis_client:
                return {}
            
            info = await self.redis_client.info()
            return {
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory", 0),
                "used_memory_human": info.get("used_memory_human", "0B"),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "total_commands_processed": info.get("total_commands_processed", 0),
                "uptime_in_seconds": info.get("uptime_in_seconds", 0)
            }
        except Exception as e:
            logger.error(f"Error getting Redis stats: {e}")
            return {}


def cache_key(*args, **kwargs) -> str:
    """Generate cache key from arguments"""
    key_parts = []
    
    # Add positional arguments
    for arg in args:
        if isinstance(arg, (str, int, float, bool)):
            key_parts.append(str(arg))
        elif hasattr(arg, 'id'):
            key_parts.append(str(arg.id))
        else:
            key_parts.append(str(arg))
    
    # Add keyword arguments
    for key, value in sorted(kwargs.items()):
        if isinstance(value, (str, int, float, bool)):
            key_parts.append(f"{key}:{value}")
        elif hasattr(value, 'id'):
            key_parts.append(f"{key}:{value.id}")
        else:
            key_parts.append(f"{key}:{str(value)}")
    
    return ":".join(key_parts)


def cached(
    expire: Optional[int] = None,
    key_prefix: str = "",
    serialize_method: str = "json"
):
    """Decorator for caching function results"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key_str = f"{key_prefix}:{cache_key(*args, **kwargs)}"
            
            # Get cache service instance
            cache_service = getattr(wrapper, '_cache_service', None)
            if not cache_service:
                # Try to get from global instance
                from server import app
                cache_service = getattr(app.state, 'cache_service', None)
            
            if not cache_service:
                # Fallback to executing function without caching
                if asyncio.iscoroutinefunction(func):
                    return await func(*args, **kwargs)
                else:
                    return func(*args, **kwargs)
            
            # Use get_or_set for caching
            return await cache_service.get_or_set(
                cache_key_str,
                func,
                expire,
                *args,
                **kwargs
            )
        
        return wrapper
    return decorator


class DatabaseCacheService:
    """Database-specific caching service with query optimization"""
    
    def __init__(self, db: AsyncIOMotorDatabase, cache_service: CacheService):
        self.db = db
        self.cache = cache_service
    
    async def get_student_stats(self, section: Optional[str] = None) -> Dict[str, Any]:
        """Get cached student statistics"""
        cache_key_str = f"student_stats:{section or 'all'}"
        
        async def compute_stats():
            pipeline = [
                {"$match": {"is_active": True, **({"section": section} if section else {})}},
                {"$group": {
                    "_id": None,
                    "total": {"$sum": 1},
                    "by_section": {"$push": "$section"},
                    "by_batch": {"$push": "$batch_year"}
                }}
            ]
            
            result = await self.db.students.aggregate(pipeline).to_list(1)
            if result:
                stats = result[0]
                return {
                    "total_students": stats["total"],
                    "sections": list(set(stats["by_section"])),
                    "batches": list(set(stats["by_batch"]))
                }
            return {"total_students": 0, "sections": [], "batches": []}
        
        return await self.cache.get_or_set(cache_key_str, compute_stats, expire=300)
    
    async def get_faculty_stats(self, department: Optional[str] = None) -> Dict[str, Any]:
        """Get cached faculty statistics"""
        cache_key_str = f"faculty_stats:{department or 'all'}"
        
        async def compute_stats():
            pipeline = [
                {"$match": {"is_active": True, **({"department": department} if department else {})}},
                {"$group": {
                    "_id": None,
                    "total": {"$sum": 1},
                    "by_department": {"$push": "$department"},
                    "subjects": {"$push": "$subjects"}
                }}
            ]
            
            result = await self.db.faculty.aggregate(pipeline).to_list(1)
            if result:
                stats = result[0]
                all_subjects = []
                for subject_list in stats["subjects"]:
                    all_subjects.extend(subject_list)
                
                return {
                    "total_faculty": stats["total"],
                    "departments": list(set(stats["by_department"])),
                    "subjects": list(set(all_subjects))
                }
            return {"total_faculty": 0, "departments": [], "subjects": []}
    
    async def get_feedback_stats(
        self, 
        semester: Optional[str] = None,
        academic_year: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get cached feedback statistics"""
        cache_key_str = f"feedback_stats:{semester or 'all'}:{academic_year or 'all'}"
        
        async def compute_stats():
            match_filter = {}
            if semester:
                match_filter["semester"] = semester
            if academic_year:
                match_filter["academic_year"] = academic_year
            
            pipeline = [
                {"$match": match_filter},
                {"$group": {
                    "_id": None,
                    "total_submissions": {"$sum": 1},
                    "by_section": {"$push": "$student_section"},
                    "by_semester": {"$push": "$semester"},
                    "by_year": {"$push": "$academic_year"},
                    "avg_ratings": {"$avg": "$faculty_feedbacks.ratings"}
                }}
            ]
            
            result = await self.db.feedback_submissions.aggregate(pipeline).to_list(1)
            if result:
                stats = result[0]
                return {
                    "total_submissions": stats["total_submissions"],
                    "sections": list(set(stats["by_section"])),
                    "semesters": list(set(stats["by_semester"])),
                    "academic_years": list(set(stats["by_year"])),
                    "average_rating": round(stats.get("avg_ratings", 0), 2)
                }
            return {
                "total_submissions": 0,
                "sections": [],
                "semesters": [],
                "academic_years": [],
                "average_rating": 0
            }
        
        return await self.cache.get_or_set(cache_key_str, compute_stats, expire=600)
    
    async def invalidate_student_cache(self, section: Optional[str] = None):
        """Invalidate student-related cache"""
        if section:
            await self.cache.delete(f"student_stats:{section}")
        await self.cache.delete_pattern("student_stats:*")
    
    async def invalidate_faculty_cache(self, department: Optional[str] = None):
        """Invalidate faculty-related cache"""
        if department:
            await self.cache.delete(f"faculty_stats:{department}")
        await self.cache.delete_pattern("faculty_stats:*")
    
    async def invalidate_feedback_cache(self, semester: Optional[str] = None, academic_year: Optional[str] = None):
        """Invalidate feedback-related cache"""
        if semester and academic_year:
            await self.cache.delete(f"feedback_stats:{semester}:{academic_year}")
        await self.cache.delete_pattern("feedback_stats:*")


# Global cache service instance
cache_service = CacheService()
