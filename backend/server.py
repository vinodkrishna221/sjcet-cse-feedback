from fastapi import FastAPI, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from dotenv import load_dotenv
import os
import logging
import time
from pathlib import Path
from error_handling import global_exception_handler

# Load environment variables first
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import performance optimization services
from cache_service import cache_service, DatabaseCacheService
from query_optimizer import initialize_query_optimization, optimized_queries
from monitoring import performance_monitor, system_monitor, initialize_monitoring, health_checker
from database_optimizer import initialize_database_optimization

# Import database connection
from database import connect_to_mongo, close_mongo_connection, get_database

# Import authentication helpers
from auth import AuthHelpers

# Import middleware
from middleware import rate_limit_middleware, security_headers_middleware
from security_middleware import SecurityMiddleware, CSRFMiddleware, SessionMiddleware, AccountLockoutMiddleware

# Import routes
from routes.auth_routes import router as auth_router
from routes.student_routes import router as student_router
from routes.faculty_routes import router as faculty_router
from routes.feedback_routes import router as feedback_router
from routes.admin_routes import router as admin_router
from routes.draft_routes import router as draft_router

# Create the main app without a prefix
app = FastAPI(
    title="Student Feedback Management System",
    version="1.0.0",
    description="""
    A comprehensive student feedback management system for educational institutions.
    
    ## Features
    
    * **Student Management**: Manage student records, sections, and batches
    * **Faculty Management**: Manage faculty members and their subjects
    * **Feedback System**: Anonymous feedback submission and analytics
    * **Report Generation**: Generate detailed reports in multiple formats
    * **Admin Dashboard**: Comprehensive admin interface for HODs and Principals
    
    ## Authentication
    
    The API uses JWT tokens for authentication. Include the token in the Authorization header:
    ```
    Authorization: Bearer <your-token>
    ```
    
    ## Error Handling
    
    All errors follow a standardized format with error codes:
    ```json
    {
        "success": false,
        "error_code": "AUTH_001",
        "message": "Invalid username or password",
        "details": {}
    }
    ```
    
    ## Rate Limiting
    
    API requests are rate-limited based on user role:
    - Anonymous: 30 requests/minute
    - Students: 100 requests/minute
    - HODs: 150 requests/minute
    - Principals: 200 requests/minute
    """,
    contact={
        "name": "Student Feedback System Support",
        "email": "support@college.edu",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    servers=[
        {
            "url": "http://localhost:8000",
            "description": "Development server"
        },
        {
            "url": "https://api.college.edu",
            "description": "Production server"
        }
    ],
    openapi_tags=[
        {
            "name": "Authentication",
            "description": "User authentication and authorization"
        },
        {
            "name": "Students",
            "description": "Student management operations"
        },
        {
            "name": "Faculty",
            "description": "Faculty management operations"
        },
        {
            "name": "Feedback",
            "description": "Feedback submission and analytics"
        },
        {
            "name": "Admin",
            "description": "Administrative operations"
        },
        {
            "name": "Reports",
            "description": "Report generation and management"
        }
    ]
)

# Add global exception handler
app.add_exception_handler(Exception, global_exception_handler)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api/v1")

# Health check endpoint
@api_router.get("/")
async def root():
    return {"message": "Student Feedback Management System API", "version": "1.0.0", "status": "healthy"}

# Add root endpoint for Render health checks
@app.api_route("/", methods=["GET", "HEAD"])
async def root_health():
    """Root endpoint for Render health checks"""
    return {"message": "Student Feedback Management System API", "version": "1.0.0", "status": "healthy"}

# Add favicon endpoint to handle favicon requests
@app.api_route("/favicon.ico", methods=["GET", "HEAD"])
async def favicon():
    """Handle favicon requests"""
    return {"message": "No favicon available"}

@api_router.get("/health")
async def health_check():
    """Enhanced health check with performance metrics"""
    if health_checker:
        return await health_checker.check_health()
    return {"status": "healthy", "service": "feedback-management-api"}

@api_router.get("/metrics")
async def get_metrics():
    """Get performance metrics"""
    return {
        "performance": performance_monitor.get_stats(),
        "system": system_monitor.get_system_stats(),
        "cache": await cache_service.get_stats() if cache_service else {}
    }

@api_router.get("/metrics/recent")
async def get_recent_metrics(limit: int = 100):
    """Get recent performance metrics"""
    return {
        "recent_metrics": performance_monitor.get_recent_metrics(limit),
        "endpoint_stats": performance_monitor.get_endpoint_stats()
    }

# Include all routers
api_router.include_router(auth_router)
api_router.include_router(student_router)
api_router.include_router(faculty_router)
api_router.include_router(feedback_router)
api_router.include_router(admin_router)
api_router.include_router(draft_router)

# Include the router in the main app
app.include_router(api_router)

# Add security middleware - Configure trusted hosts for production
allowed_hosts = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1,*.onrender.com,*.yourdomain.com').split(',')
allowed_hosts = [host.strip() for host in allowed_hosts if host.strip()]

# In production, allow all hosts for Render deployment
if os.environ.get('ENVIRONMENT') == 'production' or os.environ.get('RENDER'):
    allowed_hosts = ["*"]

app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

# CORS Configuration - Configure for production
cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173,https://sjcet-feedback-portal.netlify.app').split(',')
cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-CSRF-Token"],
    expose_headers=["X-CSRF-Token"],
)

# Add advanced security middleware
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-here")
app.add_middleware(AccountLockoutMiddleware)
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)
app.add_middleware(CSRFMiddleware, secret_key=SECRET_KEY)
app.add_middleware(SecurityMiddleware, secret_key=SECRET_KEY)

# Add performance monitoring middleware
@app.middleware("http")
async def performance_monitoring_middleware(request: Request, call_next):
    """Middleware to monitor request performance"""
    start_time = time.time()
    
    # Process request
    response = await call_next(request)
    
    # Calculate metrics
    process_time = (time.time() - start_time) * 1000  # Convert to milliseconds
    
    # Record metrics
    performance_monitor.record_request(
        endpoint=str(request.url.path),
        method=request.method,
        response_time_ms=process_time,
        status_code=response.status_code
    )
    
    return response

# Add custom middleware
app.middleware("http")(rate_limit_middleware)
app.middleware("http")(security_headers_middleware)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db_client():
    """Initialize database connection and performance services"""
    try:
        await connect_to_mongo()
        await AuthHelpers.initialize_admin_accounts()
        
        # Initialize performance optimization services
        # Make cache service optional
        try:
            await cache_service.connect()
        except Exception as e:
            logger.warning(f"Cache service unavailable: {e}. Continuing without caching.")
        
        await initialize_query_optimization(get_database())
        await initialize_database_optimization(get_database())
        initialize_monitoring(get_database(), cache_service)
        
        # Store services in app state for global access
        app.state.cache_service = cache_service
        app.state.db_cache_service = DatabaseCacheService(get_database(), cache_service)
        app.state.optimized_queries = optimized_queries
        
        logger.info("Application startup completed successfully")
    except Exception as e:
        logger.error(f"Error during startup: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_db_client():
    """Close database connection and performance services"""
    await cache_service.disconnect()
    await close_mongo_connection()
    logger.info("Application shutdown completed")
