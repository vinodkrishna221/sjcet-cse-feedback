"""
Rate limiting and security middleware
"""
import time
import logging
from typing import Dict, Optional
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
import os

logger = logging.getLogger(__name__)

# In-memory rate limiting (for production, use Redis)
rate_limit_storage: Dict[str, Dict[str, float]] = {}

class RateLimiter:
    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    def is_allowed(self, client_ip: str) -> bool:
        """Check if request is allowed based on rate limit"""
        current_time = time.time()
        window_start = current_time - self.window_seconds
        
        # Clean old entries
        if client_ip in rate_limit_storage:
            rate_limit_storage[client_ip] = {
                timestamp: count for timestamp, count in rate_limit_storage[client_ip].items()
                if float(timestamp) > window_start
            }
        else:
            rate_limit_storage[client_ip] = {}
        
        # Count requests in current window
        current_requests = sum(rate_limit_storage[client_ip].values())
        
        if current_requests >= self.max_requests:
            return False
        
        # Add current request
        current_timestamp = str(current_time)
        if current_timestamp in rate_limit_storage[client_ip]:
            rate_limit_storage[client_ip][current_timestamp] += 1
        else:
            rate_limit_storage[client_ip][current_timestamp] = 1
        
        return True

# Global rate limiter instance
rate_limiter = RateLimiter(
    max_requests=int(os.environ.get('RATE_LIMIT_PER_MINUTE', '60')),
    window_seconds=60
)

async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    client_ip = request.client.host
    
    if not rate_limiter.is_allowed(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "success": False,
                "message": "Rate limit exceeded. Please try again later.",
                "error": "RATE_LIMIT_EXCEEDED"
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
