"""
Draft management routes for feedback forms
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from auth import AuthService
from database import DatabaseOperations
from models import APIResponse
from middleware import rate_limit_middleware

logger = logging.getLogger(__name__)
router = APIRouter()

security = HTTPBearer()

async def get_current_student(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current student user"""
    student = await AuthService.get_current_student(credentials.credentials)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    return student

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current admin user"""
    admin = await AuthService.get_current_admin(credentials.credentials)
    if not admin or admin.role not in ["hod", "principal"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized - admin access required"
        )
    return admin

@router.post("/save-draft", response_model=APIResponse)
async def save_draft(
    draft_data: Dict[str, Any],
    student: Any = Depends(get_current_student)
):
    """Save feedback draft for student"""
    try:
        # Validate draft data structure
        required_fields = ['student_section', 'semester', 'academic_year', 'faculty_feedbacks']
        for field in required_fields:
            if field not in draft_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing required field: {field}"
                )

        # Check if draft already exists
        existing_draft = await DatabaseOperations.find_one(
            "feedback_drafts",
            {
                "student_id": student.id,
                "semester": draft_data["semester"],
                "academic_year": draft_data["academic_year"]
            }
        )

        draft_document = {
            "student_id": student.id,
            "student_section": draft_data["student_section"],
            "semester": draft_data["semester"],
            "academic_year": draft_data["academic_year"],
            "faculty_feedbacks": draft_data["faculty_feedbacks"],
            "is_anonymous": draft_data.get("is_anonymous", True),
            "draft_saved_at": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        if existing_draft:
            # Update existing draft
            await DatabaseOperations.update_one(
                "feedback_drafts",
                {"_id": existing_draft["_id"]},
                draft_document
            )
            message = "Draft updated successfully"
        else:
            # Create new draft
            await DatabaseOperations.insert_one("feedback_drafts", draft_document)
            message = "Draft saved successfully"

        return APIResponse(
            success=True,
            message=message,
            data={
                "draft_id": existing_draft["_id"] if existing_draft else None,
                "saved_at": draft_document["draft_saved_at"]
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Draft save error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during draft save"
        )

@router.get("/load-draft", response_model=APIResponse)
async def load_draft(
    semester: str,
    academic_year: str,
    student: Any = Depends(get_current_student)
):
    """Load feedback draft for student"""
    try:
        draft = await DatabaseOperations.find_one(
            "feedback_drafts",
            {
                "student_id": student.id,
                "semester": semester,
                "academic_year": academic_year
            }
        )

        if not draft:
            return APIResponse(
                success=True,
                message="No draft found",
                data=None
            )

        # Remove internal fields
        draft_data = {
            "student_section": draft["student_section"],
            "semester": draft["semester"],
            "academic_year": draft["academic_year"],
            "faculty_feedbacks": draft["faculty_feedbacks"],
            "is_anonymous": draft.get("is_anonymous", True),
            "draft_saved_at": draft["draft_saved_at"]
        }

        return APIResponse(
            success=True,
            message="Draft loaded successfully",
            data=draft_data
        )

    except Exception as e:
        logger.error(f"Draft load error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during draft load"
        )

@router.get("/list-drafts", response_model=APIResponse)
async def list_drafts(
    student: Any = Depends(get_current_student)
):
    """List all drafts for student"""
    try:
        drafts = await DatabaseOperations.find_many(
            "feedback_drafts",
            {"student_id": student.id},
            sort={"draft_saved_at": -1}
        )

        # Remove sensitive data
        draft_list = []
        for draft in drafts:
            draft_list.append({
                "id": str(draft["_id"]),
                "semester": draft["semester"],
                "academic_year": draft["academic_year"],
                "draft_saved_at": draft["draft_saved_at"],
                "faculty_count": len(draft.get("faculty_feedbacks", [])),
                "is_complete": len(draft.get("faculty_feedbacks", [])) > 0
            })

        return APIResponse(
            success=True,
            message=f"Retrieved {len(draft_list)} drafts",
            data=draft_list
        )

    except Exception as e:
        logger.error(f"Draft list error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during draft list"
        )

@router.delete("/delete-draft/{draft_id}", response_model=APIResponse)
async def delete_draft(
    draft_id: str,
    student: Any = Depends(get_current_student)
):
    """Delete a specific draft"""
    try:
        # Verify draft belongs to student
        draft = await DatabaseOperations.find_one(
            "feedback_drafts",
            {
                "_id": draft_id,
                "student_id": student.id
            }
        )

        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Draft not found"
            )

        await DatabaseOperations.delete_one("feedback_drafts", {"_id": draft_id})

        return APIResponse(
            success=True,
            message="Draft deleted successfully",
            data=None
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Draft delete error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during draft delete"
        )

@router.post("/cleanup-expired-drafts", response_model=APIResponse)
async def cleanup_expired_drafts(
    admin: Any = Depends(get_current_admin)
):
    """Clean up expired drafts (admin only)"""
    try:
        # Delete drafts older than 30 days
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        result = await DatabaseOperations.delete_many(
            "feedback_drafts",
            {"draft_saved_at": {"$lt": cutoff_date}}
        )

        return APIResponse(
            success=True,
            message=f"Cleaned up {result.deleted_count} expired drafts",
            data={"deleted_count": result.deleted_count}
        )

    except Exception as e:
        logger.error(f"Draft cleanup error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during draft cleanup"
        )

@router.get("/draft-stats", response_model=APIResponse)
async def get_draft_stats(
    admin: Any = Depends(get_current_admin)
):
    """Get draft statistics (admin only)"""
    try:
        # Total drafts
        total_drafts = await DatabaseOperations.count_documents("feedback_drafts", {})
        
        # Drafts by semester
        pipeline = [
            {
                "$group": {
                    "_id": {
                        "semester": "$semester",
                        "academic_year": "$academic_year"
                    },
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id.academic_year": -1, "_id.semester": 1}}
        ]
        
        semester_stats = await DatabaseOperations.aggregate("feedback_drafts", pipeline)
        
        # Recent drafts (last 7 days)
        recent_cutoff = datetime.utcnow() - timedelta(days=7)
        recent_drafts = await DatabaseOperations.count_documents(
            "feedback_drafts",
            {"draft_saved_at": {"$gte": recent_cutoff}}
        )

        return APIResponse(
            success=True,
            message="Draft statistics retrieved successfully",
            data={
                "total_drafts": total_drafts,
                "recent_drafts": recent_drafts,
                "by_semester": semester_stats
            }
        )

    except Exception as e:
        logger.error(f"Draft stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during draft stats"
        )
