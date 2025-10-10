"""
Performance monitoring service for backend optimization
"""
import time
import asyncio
import logging
from typing import Any, Dict, List, Optional, Callable
from datetime import datetime, timedelta
from functools import wraps
import psutil
import os
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetrics:
    """Performance metrics data class"""
    timestamp: datetime
    endpoint: str
    method: str
    response_time_ms: float
    status_code: int
    memory_usage_mb: float
    cpu_percent: float
    active_connections: int
    cache_hits: int
    cache_misses: int
    db_query_time_ms: float
    db_queries_count: int


class PerformanceMonitor:
    """Performance monitoring service"""
    
    def __init__(self):
        self.metrics: List[PerformanceMetrics] = []
        self.max_metrics = 10000  # Keep last 10k metrics
        self._start_time = time.time()
        self._request_count = 0
        self._error_count = 0
        self._cache_hits = 0
        self._cache_misses = 0
        self._db_query_time = 0.0
        self._db_query_count = 0
    
    def record_request(
        self,
        endpoint: str,
        method: str,
        response_time_ms: float,
        status_code: int
    ):
        """Record request metrics"""
        try:
            # Get system metrics
            memory_usage = psutil.virtual_memory().used / 1024 / 1024  # MB
            cpu_percent = psutil.cpu_percent()
            
            # Get process-specific metrics
            process = psutil.Process(os.getpid())
            process_memory = process.memory_info().rss / 1024 / 1024  # MB
            
            # Create metrics record
            metrics = PerformanceMetrics(
                timestamp=datetime.utcnow(),
                endpoint=endpoint,
                method=method,
                response_time_ms=response_time_ms,
                status_code=status_code,
                memory_usage_mb=process_memory,
                cpu_percent=cpu_percent,
                active_connections=self._get_active_connections(),
                cache_hits=self._cache_hits,
                cache_misses=self._cache_misses,
                db_query_time_ms=self._db_query_time,
                db_queries_count=self._db_query_count
            )
            
            # Add to metrics list
            self.metrics.append(metrics)
            
            # Trim metrics if too many
            if len(self.metrics) > self.max_metrics:
                self.metrics = self.metrics[-self.max_metrics:]
            
            # Update counters
            self._request_count += 1
            if status_code >= 400:
                self._error_count += 1
            
            # Reset per-request counters
            self._cache_hits = 0
            self._cache_misses = 0
            self._db_query_time = 0.0
            self._db_query_count = 0
            
        except Exception as e:
            logger.error(f"Error recording request metrics: {e}")
    
    def record_cache_hit(self):
        """Record cache hit"""
        self._cache_hits += 1
    
    def record_cache_miss(self):
        """Record cache miss"""
        self._cache_misses += 1
    
    def record_db_query(self, query_time_ms: float):
        """Record database query"""
        self._db_query_time += query_time_ms
        self._db_query_count += 1
    
    def _get_active_connections(self) -> int:
        """Get number of active connections"""
        try:
            # This would need to be implemented based on your connection pool
            return 0
        except Exception:
            return 0
    
    def get_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        try:
            if not self.metrics:
                return {
                    "uptime_seconds": time.time() - self._start_time,
                    "total_requests": 0,
                    "error_rate": 0,
                    "average_response_time": 0,
                    "cache_hit_rate": 0,
                    "average_db_query_time": 0
                }
            
            # Calculate statistics
            total_requests = len(self.metrics)
            error_requests = sum(1 for m in self.metrics if m.status_code >= 400)
            error_rate = (error_requests / total_requests) * 100 if total_requests > 0 else 0
            
            avg_response_time = sum(m.response_time_ms for m in self.metrics) / total_requests
            
            total_cache_hits = sum(m.cache_hits for m in self.metrics)
            total_cache_misses = sum(m.cache_misses for m in self.metrics)
            cache_hit_rate = (total_cache_hits / (total_cache_hits + total_cache_misses)) * 100 if (total_cache_hits + total_cache_misses) > 0 else 0
            
            avg_db_query_time = sum(m.db_query_time_ms for m in self.metrics) / total_requests
            
            return {
                "uptime_seconds": time.time() - self._start_time,
                "total_requests": total_requests,
                "error_rate": round(error_rate, 2),
                "average_response_time": round(avg_response_time, 2),
                "cache_hit_rate": round(cache_hit_rate, 2),
                "average_db_query_time": round(avg_db_query_time, 2),
                "memory_usage_mb": round(sum(m.memory_usage_mb for m in self.metrics) / total_requests, 2),
                "cpu_percent": round(sum(m.cpu_percent for m in self.metrics) / total_requests, 2)
            }
        except Exception as e:
            logger.error(f"Error getting performance stats: {e}")
            return {}
    
    def get_recent_metrics(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent performance metrics"""
        try:
            recent_metrics = self.metrics[-limit:] if self.metrics else []
            return [asdict(metric) for metric in recent_metrics]
        except Exception as e:
            logger.error(f"Error getting recent metrics: {e}")
            return []
    
    def get_endpoint_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics by endpoint"""
        try:
            endpoint_stats = {}
            
            for metric in self.metrics:
                endpoint = metric.endpoint
                if endpoint not in endpoint_stats:
                    endpoint_stats[endpoint] = {
                        "count": 0,
                        "total_time": 0,
                        "errors": 0,
                        "methods": set()
                    }
                
                stats = endpoint_stats[endpoint]
                stats["count"] += 1
                stats["total_time"] += metric.response_time_ms
                stats["methods"].add(metric.method)
                
                if metric.status_code >= 400:
                    stats["errors"] += 1
            
            # Calculate averages and convert sets to lists
            for endpoint, stats in endpoint_stats.items():
                stats["average_time"] = round(stats["total_time"] / stats["count"], 2)
                stats["error_rate"] = round((stats["errors"] / stats["count"]) * 100, 2)
                stats["methods"] = list(stats["methods"])
            
            return endpoint_stats
        except Exception as e:
            logger.error(f"Error getting endpoint stats: {e}")
            return {}


def monitor_performance(func: Callable) -> Callable:
    """Decorator to monitor function performance"""
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            return result
        finally:
            end_time = time.time()
            execution_time = (end_time - start_time) * 1000  # Convert to milliseconds
            
            # Record the performance
            if hasattr(async_wrapper, '_monitor'):
                async_wrapper._monitor.record_db_query(execution_time)
    
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            end_time = time.time()
            execution_time = (end_time - start_time) * 1000  # Convert to milliseconds
            
            # Record the performance
            if hasattr(sync_wrapper, '_monitor'):
                sync_wrapper._monitor.record_db_query(execution_time)
    
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper


class SystemMonitor:
    """System resource monitoring"""
    
    def __init__(self):
        self._start_time = time.time()
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get system resource statistics"""
        try:
            # CPU information
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # Memory information
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_available = memory.available / 1024 / 1024 / 1024  # GB
            memory_total = memory.total / 1024 / 1024 / 1024  # GB
            
            # Disk information
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            disk_free = disk.free / 1024 / 1024 / 1024  # GB
            disk_total = disk.total / 1024 / 1024 / 1024  # GB
            
            # Network information
            network = psutil.net_io_counters()
            
            # Process information
            process = psutil.Process(os.getpid())
            process_memory = process.memory_info().rss / 1024 / 1024  # MB
            process_cpu = process.cpu_percent()
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "uptime_seconds": time.time() - self._start_time,
                "cpu": {
                    "percent": cpu_percent,
                    "count": cpu_count
                },
                "memory": {
                    "percent": memory_percent,
                    "available_gb": round(memory_available, 2),
                    "total_gb": round(memory_total, 2)
                },
                "disk": {
                    "percent": round(disk_percent, 2),
                    "free_gb": round(disk_free, 2),
                    "total_gb": round(disk_total, 2)
                },
                "network": {
                    "bytes_sent": network.bytes_sent,
                    "bytes_recv": network.bytes_recv,
                    "packets_sent": network.packets_sent,
                    "packets_recv": network.packets_recv
                },
                "process": {
                    "memory_mb": round(process_memory, 2),
                    "cpu_percent": process_cpu,
                    "pid": os.getpid()
                }
            }
        except Exception as e:
            logger.error(f"Error getting system stats: {e}")
            return {}
    
    def get_process_stats(self) -> Dict[str, Any]:
        """Get process-specific statistics"""
        try:
            process = psutil.Process(os.getpid())
            
            return {
                "pid": process.pid,
                "name": process.name(),
                "status": process.status(),
                "create_time": datetime.fromtimestamp(process.create_time()).isoformat(),
                "memory_info": {
                    "rss": process.memory_info().rss / 1024 / 1024,  # MB
                    "vms": process.memory_info().vms / 1024 / 1024,  # MB
                },
                "cpu_percent": process.cpu_percent(),
                "num_threads": process.num_threads(),
                "open_files": len(process.open_files()),
                "connections": len(process.connections())
            }
        except Exception as e:
            logger.error(f"Error getting process stats: {e}")
            return {}


class HealthChecker:
    """Health check service"""
    
    def __init__(self, db=None, cache_service=None):
        self.db = db
        self.cache_service = cache_service
        self.system_monitor = SystemMonitor()
    
    async def check_health(self) -> Dict[str, Any]:
        """Perform comprehensive health check"""
        try:
            health_status = {
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat(),
                "checks": {}
            }
            
            # Database health check
            if self.db:
                db_health = await self._check_database()
                health_status["checks"]["database"] = db_health
                if not db_health["healthy"]:
                    health_status["status"] = "unhealthy"
            
            # Cache health check
            if self.cache_service:
                cache_health = await self._check_cache()
                health_status["checks"]["cache"] = cache_health
                if not cache_health["healthy"]:
                    health_status["status"] = "degraded"
            
            # System health check
            system_health = self._check_system()
            health_status["checks"]["system"] = system_health
            if not system_health["healthy"]:
                health_status["status"] = "degraded"
            
            return health_status
        except Exception as e:
            logger.error(f"Error performing health check: {e}")
            return {
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
    
    async def _check_database(self) -> Dict[str, Any]:
        """Check database connectivity and performance"""
        try:
            start_time = time.time()
            
            # Test basic connectivity
            await self.db.command("ping")
            
            # Test query performance
            await self.db.students.count_documents({})
            
            response_time = (time.time() - start_time) * 1000
            
            return {
                "healthy": True,
                "response_time_ms": round(response_time, 2),
                "status": "connected"
            }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "healthy": False,
                "error": str(e),
                "status": "disconnected"
            }
    
    async def _check_cache(self) -> Dict[str, Any]:
        """Check cache connectivity and performance"""
        try:
            start_time = time.time()
            
            # Test cache connectivity
            await self.cache_service.set("health_check", "test", expire=10)
            value = await self.cache_service.get("health_check")
            await self.cache_service.delete("health_check")
            
            response_time = (time.time() - start_time) * 1000
            
            if value == "test":
                return {
                    "healthy": True,
                    "response_time_ms": round(response_time, 2),
                    "status": "connected"
                }
            else:
                return {
                    "healthy": False,
                    "error": "Cache read/write test failed",
                    "status": "error"
                }
        except Exception as e:
            logger.error(f"Cache health check failed: {e}")
            return {
                "healthy": False,
                "error": str(e),
                "status": "disconnected"
            }
    
    def _check_system(self) -> Dict[str, Any]:
        """Check system resource health"""
        try:
            stats = self.system_monitor.get_system_stats()
            
            # Check if resources are within acceptable limits
            cpu_healthy = stats.get("cpu", {}).get("percent", 0) < 90
            memory_healthy = stats.get("memory", {}).get("percent", 0) < 90
            disk_healthy = stats.get("disk", {}).get("percent", 0) < 90
            
            healthy = cpu_healthy and memory_healthy and disk_healthy
            
            return {
                "healthy": healthy,
                "cpu_percent": stats.get("cpu", {}).get("percent", 0),
                "memory_percent": stats.get("memory", {}).get("percent", 0),
                "disk_percent": stats.get("disk", {}).get("percent", 0),
                "status": "healthy" if healthy else "degraded"
            }
        except Exception as e:
            logger.error(f"System health check failed: {e}")
            return {
                "healthy": False,
                "error": str(e),
                "status": "error"
            }


# Global instances
performance_monitor = PerformanceMonitor()
system_monitor = SystemMonitor()
health_checker = None


def initialize_monitoring(db=None, cache_service=None):
    """Initialize monitoring services"""
    global health_checker
    health_checker = HealthChecker(db, cache_service)
