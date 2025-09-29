from fastapi import FastAPI, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from dotenv import load_dotenv
import os
import logging
from pathlib import Path

# Load environment variables first
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import database connection
from database import connect_to_mongo, close_mongo_connection

# Import authentication helpers
from auth import AuthHelpers

# Import middleware
from middleware import rate_limit_middleware, security_headers_middleware

# Import routes
from routes.auth_routes import router as auth_router
from routes.student_routes import router as student_router
from routes.faculty_routes import router as faculty_router
from routes.feedback_routes import router as feedback_router

# Create the main app without a prefix
app = FastAPI(title="Student Feedback Management System", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Health check endpoint
@api_router.get("/")
async def root():
    return {"message": "Student Feedback Management System API", "version": "1.0.0", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "feedback-management-api"}

# Include all routers
api_router.include_router(auth_router)
api_router.include_router(student_router)
api_router.include_router(faculty_router)
api_router.include_router(feedback_router)

# Include the router in the main app
app.include_router(api_router)

# Add security middleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# CORS Configuration
cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')
cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

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
    """Initialize database connection and default data"""
    try:
        await connect_to_mongo()
        await AuthHelpers.initialize_admin_accounts()
        logger.info("Application startup completed successfully")
    except Exception as e:
        logger.error(f"Error during startup: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_db_client():
    """Close database connection"""
    await close_mongo_connection()
    logger.info("Application shutdown completed")
