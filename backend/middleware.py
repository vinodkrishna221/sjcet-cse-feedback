"""
Rate limiting and security middleware
"""
import time
import logging
from typing import Dict, Optional
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
import os
import redis
import json

logger = logging.getLogger(__name__)

# Redis connection for rate limiting
redis_client = None

def get_redis_client():
    """Get Redis client for rate limiting"""
    global redis_client
    if redis_client is None:
        redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
        redis_client = redis.from_url(redis_url, decode_responses=True)
    return redis_client

class RateLimiter:
    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.redis = get_redis_client()
    
    def is_allowed(self, client_ip: str) -> bool:
        """Check if request is allowed based on rate limit using Redis"""
        try:
            current_time = int(time.time())
            window_start = current_time - self.window_seconds
            
            # Use Redis sorted set for sliding window rate limiting
            key = f"rate_limit:{client_ip}"
            
            # Remove old entries
            self.redis.zremrangebyscore(key, 0, window_start)
            
            # Count current requests
            current_requests = self.redis.zcard(key)
            
            if current_requests >= self.max_requests:
                return False
            
            # Add current request
            self.redis.zadd(key, {str(current_time): current_time})
            self.redis.expire(key, self.window_seconds)
            
            return True
            
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            # Fail open - allow request if Redis is down
            return True

# Global rate limiter instance
rate_limiter = RateLimiter(
    max_requests=int(os.environ.get('RATE_LIMIT_PER_MINUTE', '60')),
    window_seconds=60
)

async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware with role-based limits"""
    client_ip = request.client.host
    
    # Get user role from token if available
    user_role = None
    try:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            from auth import AuthService
            payload = AuthService.decode_access_token(token)
            if payload:
                user_role = payload.get("role")
    except Exception:
        pass  # Ignore token parsing errors
    
    # Set rate limits based on role
    if user_role == "principal":
        max_requests = int(os.environ.get('RATE_LIMIT_PRINCIPAL', '200'))
    elif user_role == "hod":
        max_requests = int(os.environ.get('RATE_LIMIT_HOD', '150'))
    elif user_role == "student":
        max_requests = int(os.environ.get('RATE_LIMIT_STUDENT', '100'))
    else:
        max_requests = int(os.environ.get('RATE_LIMIT_ANONYMOUS', '30'))
    
    # Create role-specific rate limiter
    role_limiter = RateLimiter(max_requests=max_requests, window_seconds=60)
    
    if not role_limiter.is_allowed(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}, Role: {user_role or 'anonymous'}")
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "success": False,
                "message": "Rate limit exceeded. Please try again later.",
                "error": "RATE_LIMIT_EXCEEDED",
                "retry_after": 60
            }
        )
    
    response = await call_next(request)
    return response

async def security_headers_middleware(request: Request, call_next):
    """Add security headers"""
    response = await call_next(request)
    
    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    return response
