from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path

# Import database connection
from database import connect_to_mongo, close_mongo_connection

# Import authentication helpers
from auth import AuthHelpers

# Import routes
from routes.auth_routes import router as auth_router
from routes.student_routes import router as student_router
from routes.faculty_routes import router as faculty_router
from routes.feedback_routes import router as feedback_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

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
