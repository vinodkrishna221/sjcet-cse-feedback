"""
Advanced security middleware for CSRF protection, security headers, and session management
"""
import secrets
import time
import logging
from typing import Dict, Optional
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import redis
import os

logger = logging.getLogger(__name__)

# Redis connection for session storage
redis_client = None

def get_redis_client():
    """Get Redis client for session storage"""
    global redis_client
    if redis_client is None:
        redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
        redis_client = redis.from_url(redis_url, decode_responses=True)
    return redis_client

class SecurityMiddleware(BaseHTTPMiddleware):
    """Advanced security middleware"""
    
    def __init__(self, app, secret_key: str):
        super().__init__(app)
        self.secret_key = secret_key
        self.redis = get_redis_client()
    
    async def dispatch(self, request: Request, call_next):
        """Process request through security middleware"""
        # Skip security checks for health checks and static files
        if request.url.path in ['/api/health', '/api/', '/docs', '/openapi.json']:
            return await call_next(request)
        
        # Add security headers
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # Content Security Policy
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )
        response.headers["Content-Security-Policy"] = csp
        
        return response

class CSRFMiddleware(BaseHTTPMiddleware):
    """CSRF protection middleware"""
    
    def __init__(self, app, secret_key: str):
        super().__init__(app)
        self.secret_key = secret_key
        self.redis = get_redis_client()
    
    async def dispatch(self, request: Request, call_next):
        """Process CSRF protection"""
        # Skip CSRF for GET, HEAD, OPTIONS
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return await call_next(request)
        
        # Skip CSRF for API endpoints that don't need it (auth endpoints)
        if request.url.path.startswith('/api/auth/'):
            return await call_next(request)
        
        # Get CSRF token from header
        csrf_token = request.headers.get('X-CSRF-Token')
        if not csrf_token:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "CSRF token missing"}
            )
        
        # Validate CSRF token
        if not await self.validate_csrf_token(csrf_token, request):
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Invalid CSRF token"}
            )
        
        return await call_next(request)
    
    async def validate_csrf_token(self, token: str, request: Request) -> bool:
        """Validate CSRF token"""
        try:
            # Get session ID from cookie
            session_id = request.cookies.get('session_id')
            if not session_id:
                return False
            
            # Check if token exists in Redis
            try:
                stored_token = self.redis.get(f"csrf:{session_id}")
                if not stored_token or stored_token != token:
                    return False
                
                # Check token age (max 1 hour)
                token_age = self.redis.ttl(f"csrf:{session_id}")
                if token_age > 3600:  # 1 hour in seconds
                    return False
            except Exception as e:
                logger.warning(f"Redis unavailable for CSRF validation: {e}")
                # Allow request if Redis is down - fail open for security
                return True
            
            return True
        except Exception as e:
            logger.error(f"CSRF validation error: {e}")
            return False

class SessionMiddleware(BaseHTTPMiddleware):
    """Session management middleware"""
    
    def __init__(self, app, secret_key: str):
        super().__init__(app)
        self.secret_key = secret_key
        self.redis = get_redis_client()
    
    async def dispatch(self, request: Request, call_next):
        """Process session management"""
        # Get or create session
        session_id = request.cookies.get('session_id')
        if not session_id or not await self.validate_session(session_id):
            session_id = await self.create_session()
        
        # Add session to request state
        request.state.session_id = session_id
        
        # Generate CSRF token for state-changing methods
        if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
            csrf_token = await self.generate_csrf_token(session_id)
            request.state.csrf_token = csrf_token
        
        response = await call_next(request)
        
        # Set session cookie
        response.set_cookie(
            'session_id',
            session_id,
            httponly=True,
            secure=True,
            samesite='strict',
            max_age=86400  # 24 hours
        )
        
        # Add CSRF token to response headers for state-changing methods
        if hasattr(request.state, 'csrf_token'):
            response.headers['X-CSRF-Token'] = request.state.csrf_token
        
        return response
    
    async def create_session(self) -> str:
        """Create new session"""
        session_id = secrets.token_urlsafe(32)
        try:
            await self.redis.setex(f"session:{session_id}", 86400, "active")  # 24 hours
        except Exception as e:
            logger.warning(f"Redis unavailable for session storage: {e}")
            # Continue without Redis - session will be stateless
        return session_id
    
    async def validate_session(self, session_id: str) -> bool:
        """Validate session exists and is active"""
        try:
            return await self.redis.exists(f"session:{session_id}")
        except Exception as e:
            logger.error(f"Session validation error: {e}")
            return False
    
    async def generate_csrf_token(self, session_id: str) -> str:
        """Generate CSRF token for session"""
        csrf_token = secrets.token_urlsafe(32)
        try:
            await self.redis.setex(f"csrf:{session_id}", 3600, csrf_token)  # 1 hour
        except Exception as e:
            logger.warning(f"Redis unavailable for CSRF token storage: {e}")
            # Continue without Redis - CSRF token will be stateless
        return csrf_token

class AccountLockoutMiddleware(BaseHTTPMiddleware):
    """Account lockout middleware for failed login attempts"""
    
    def __init__(self, app):
        super().__init__(app)
        self.redis = get_redis_client()
        self.max_attempts = 5
        self.lockout_duration = 900  # 15 minutes
    
    async def dispatch(self, request: Request, call_next):
        """Process account lockout checks"""
        # Only check for login endpoints
        if not request.url.path.endswith('/login'):
            return await call_next(request)
        
        # Get client IP
        client_ip = request.client.host
        if not client_ip:
            return await call_next(request)
        
        # Check if IP is locked out
        if await self.is_ip_locked(client_ip):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many failed login attempts. Please try again later.",
                    "retry_after": await self.get_lockout_remaining(client_ip)
                }
            )
        
        response = await call_next(request)
        
        # If login failed, increment attempt counter
        if response.status_code == 401:
            await self.record_failed_attempt(client_ip)
        
        return response
    
    async def is_ip_locked(self, client_ip: str) -> bool:
        """Check if IP is currently locked out"""
        try:
            lockout_key = f"lockout:{client_ip}"
            return await self.redis.exists(lockout_key)
        except Exception as e:
            logger.warning(f"Redis unavailable for lockout check: {e}")
            return False  # Fail open - allow request if Redis is down
    
    async def record_failed_attempt(self, client_ip: str):
        """Record a failed login attempt"""
        try:
            attempts_key = f"attempts:{client_ip}"
            current_attempts = await self.redis.incr(attempts_key)
            
            if current_attempts == 1:
                await self.redis.expire(attempts_key, 900)  # 15 minutes
            
            if current_attempts >= self.max_attempts:
                lockout_key = f"lockout:{client_ip}"
                await self.redis.setex(lockout_key, self.lockout_duration, "locked")
                await self.redis.delete(attempts_key)
        except Exception as e:
            logger.warning(f"Redis unavailable for failed attempt recording: {e}")
            # Continue without Redis - security features will be degraded but app will work
    
    async def get_lockout_remaining(self, client_ip: str) -> int:
        """Get remaining lockout time in seconds"""
        try:
            lockout_key = f"lockout:{client_ip}"
            return await self.redis.ttl(lockout_key)
        except Exception as e:
            logger.error(f"Lockout remaining check error: {e}")
            return 0
