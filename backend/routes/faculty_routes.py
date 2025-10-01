from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Any, Optional
import pandas as pd
import io
import logging
from models import (
    Faculty, FacultyCreate, FacultyImport, FacultyResponse, 
    APIResponse, ImportResult, Section
)
from database import DatabaseOperations
from auth import AuthService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/faculty", tags=["Faculty"])
security = HTTPBearer()

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current admin user"""
    admin = await AuthService.get_current_admin(credentials.credentials)
    if not admin or admin.role not in ["hod", "principal"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return admin

async def get_current_student(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current student user"""
    student = await AuthService.get_current_student(credentials.credentials)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required"
        )
    return student

@router.get("/", response_model=APIResponse)
async def get_all_faculty(
    section: Optional[str] = None,
    subject: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    admin: Any = Depends(get_current_admin)
):
    """Get all faculty with optional filters"""
    try:
        filter_dict = {"is_active": True}
        
        if section:
            filter_dict["sections"] = {"$in": [section]}
        if subject:
            filter_dict["subjects"] = {"$in": [subject]}
        
        faculty_list = await DatabaseOperations.find_many(
            "faculty", 
            filter_dict=filter_dict,
            limit=limit,
            sort=[("name", 1)]
        )
        
        faculty_responses = [
            FacultyResponse(
                id=faculty["id"],
                faculty_id=faculty["faculty_id"],
                name=faculty["name"],
                subjects=faculty["subjects"],
                sections=faculty["sections"],
                email=faculty.get("email"),
                department=faculty.get("department"),
                designation=faculty.get("designation")
            ) for faculty in faculty_list
        ]
        
        return APIResponse(
            success=True,
            message=f"Retrieved {len(faculty_responses)} faculty members",
            data={"faculty": faculty_responses, "total": len(faculty_responses)}
        )
        
    except Exception as e:
        logger.error(f"Error retrieving faculty: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving faculty"
        )

@router.get("/{faculty_id}", response_model=APIResponse)
async def get_faculty(
    faculty_id: str,
    admin: Any = Depends(get_current_admin)
):
    """Get faculty by ID"""
    try:
        faculty = await DatabaseOperations.find_one("faculty", {"id": faculty_id})
        
        if not faculty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty not found"
            )
        
        faculty_response = FacultyResponse(
            id=faculty["id"],
            faculty_id=faculty["faculty_id"],
            name=faculty["name"],
            subjects=faculty["subjects"],
            sections=faculty["sections"],
            email=faculty.get("email"),
            department=faculty.get("department"),
            designation=faculty.get("designation")
        )
        
        return APIResponse(
            success=True,
            message="Faculty retrieved successfully",
            data={"faculty": faculty_response}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving faculty: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving faculty"
        )

@router.post("/", response_model=APIResponse)
async def create_faculty(
    faculty_data: FacultyCreate,
    admin: Any = Depends(get_current_admin)
):
    """Create a new faculty member"""
    try:
        # Check if faculty already exists
        existing_faculty = await DatabaseOperations.find_one(
            "faculty", 
            {"faculty_id": faculty_data.faculty_id.upper()}
        )
        
        if existing_faculty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Faculty with this ID already exists"
            )
        
        # Create faculty document
        import uuid
        faculty_doc = faculty_data.dict()
        faculty_doc["id"] = str(uuid.uuid4())  # Add UUID id field
        faculty_doc["faculty_id"] = faculty_doc["faculty_id"].upper()
        faculty_doc["is_active"] = True
        
        faculty_id = await DatabaseOperations.insert_one("faculty", faculty_doc)
        
        return APIResponse(
            success=True,
            message="Faculty created successfully",
            data={"faculty_id": faculty_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating faculty: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating faculty"
        )

@router.put("/{faculty_id}", response_model=APIResponse)
async def update_faculty(
    faculty_id: str,
    faculty_data: FacultyCreate,
    admin: Any = Depends(get_current_admin)
):
    """Update faculty information"""
    try:
        # Check if faculty exists
        existing_faculty = await DatabaseOperations.find_one("faculty", {"id": faculty_id})
        
        if not existing_faculty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty not found"
            )
        
        # Check for duplicate faculty ID (excluding current faculty)
        duplicate_faculty = await DatabaseOperations.find_one(
            "faculty",
            {
                "faculty_id": faculty_data.faculty_id.upper(),
                "id": {"$ne": faculty_id}
            }
        )
        
        if duplicate_faculty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Another faculty member with this ID already exists"
            )
        
        # Update faculty
        update_dict = faculty_data.dict()
        update_dict["faculty_id"] = update_dict["faculty_id"].upper()
        
        updated = await DatabaseOperations.update_one(
            "faculty",
            {"id": faculty_id},
            update_dict
        )
        
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update faculty"
            )
        
        return APIResponse(
            success=True,
            message="Faculty updated successfully",
            data=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating faculty: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating faculty"
        )

@router.delete("/{faculty_id}", response_model=APIResponse)
async def delete_faculty(
    faculty_id: str,
    admin: Any = Depends(get_current_admin)
):
    """Soft delete faculty (mark as inactive)"""
    try:
        updated = await DatabaseOperations.update_one(
            "faculty",
            {"id": faculty_id},
            {"is_active": False}
        )
        
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty not found"
            )
        
        return APIResponse(
            success=True,
            message="Faculty deactivated successfully",
            data=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting faculty: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting faculty"
        )

@router.post("/import", response_model=APIResponse)
async def import_faculty(
    faculty_import: FacultyImport,
    admin: Any = Depends(get_current_admin)
):
    """Import multiple faculty members from JSON data"""
    try:
        success_count = 0
        error_count = 0
        errors = []
        
        for i, faculty_data in enumerate(faculty_import.faculty):
            try:
                # Check for duplicate
                existing_faculty = await DatabaseOperations.find_one(
                    "faculty",
                    {"faculty_id": faculty_data.faculty_id.upper()}
                )
                
                if existing_faculty:
                    errors.append(f"Row {i+1}: Faculty {faculty_data.faculty_id} already exists")
                    error_count += 1
                    continue
                
                # Create faculty document
                import uuid
                faculty_doc = faculty_data.dict()
                faculty_doc["id"] = str(uuid.uuid4())  # Add UUID id field
                faculty_doc["faculty_id"] = faculty_doc["faculty_id"].upper()
                faculty_doc["is_active"] = True
                
                await DatabaseOperations.insert_one("faculty", faculty_doc)
                success_count += 1
                
            except Exception as e:
                errors.append(f"Row {i+1}: {str(e)}")
                error_count += 1
        
        result = ImportResult(
            success_count=success_count,
            error_count=error_count,
            errors=errors,
            warnings=[],
            total_processed=len(faculty_import.faculty)
        )
        
        return APIResponse(
            success=True,
            message=f"Import completed: {success_count} successful, {error_count} errors",
            data=result.dict()
        )
        
    except Exception as e:
        logger.error(f"Error importing faculty: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error importing faculty"
        )

@router.post("/import/csv", response_model=APIResponse)
async def import_faculty_csv(
    file: UploadFile = File(...),
    admin: Any = Depends(get_current_admin)
):
    """Import faculty from CSV file"""
    try:
        # Validate file type
        if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only CSV and Excel files are allowed"
            )
        
        # Read file content
        content = await file.read()
        
        # Parse file based on extension
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:  # Excel file
            df = pd.read_excel(io.BytesIO(content))
        
        # Validate required columns
        required_columns = ['faculty_id', 'name', 'subjects', 'sections']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        success_count = 0
        error_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Parse subjects (comma-separated)
                subjects = [s.strip() for s in str(row['subjects']).split(',')]
                
                # Parse sections (comma-separated)
                sections_raw = [s.strip().upper() for s in str(row['sections']).split(',')]
                sections = []
                for section in sections_raw:
                    if section not in ['A', 'B']:
                        errors.append(f"Row {index+1}: Invalid section '{section}'. Must be A or B")
                        error_count += 1
                        continue
                    sections.append(section)
                
                if not sections:  # If no valid sections found
                    continue
                
                # Check for duplicate
                faculty_id = str(row['faculty_id']).strip().upper()
                existing_faculty = await DatabaseOperations.find_one(
                    "faculty",
                    {"faculty_id": faculty_id}
                )
                
                if existing_faculty:
                    errors.append(f"Row {index+1}: Faculty {faculty_id} already exists")
                    error_count += 1
                    continue
                
                # Create faculty document
                import uuid
                faculty_doc = {
                    "id": str(uuid.uuid4()),  # Add UUID id field
                    "faculty_id": faculty_id,
                    "name": str(row['name']).strip(),
                    "subjects": subjects,
                    "sections": sections,
                    "email": str(row.get('email', '')).strip() if pd.notna(row.get('email')) else None,
                    "phone": str(row.get('phone', '')).strip() if pd.notna(row.get('phone')) else None,
                    "department": str(row.get('department', '')).strip() if pd.notna(row.get('department')) else None,
                    "designation": str(row.get('designation', '')).strip() if pd.notna(row.get('designation')) else None,
                    "is_active": True
                }
                
                await DatabaseOperations.insert_one("faculty", faculty_doc)
                success_count += 1
                
            except Exception as e:
                errors.append(f"Row {index+1}: {str(e)}")
                error_count += 1
        
        result = ImportResult(
            success_count=success_count,
            error_count=error_count,
            errors=errors,
            warnings=[],
            total_processed=len(df)
        )
        
        return APIResponse(
            success=True,
            message=f"CSV import completed: {success_count} successful, {error_count} errors",
            data=result.dict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing CSV: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error importing CSV file"
        )

@router.get("/by-section/{section}", response_model=APIResponse)
async def get_faculty_by_section(
    section: str,
    student: Any = Depends(get_current_student)
):
    """Get faculty members teaching a specific section"""
    try:
        if section.upper() not in ['A', 'B']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Section must be A or B"
            )
        
        faculty_list = await DatabaseOperations.find_many(
            "faculty",
            {
                "sections": {"$in": [section.upper()]},
                "is_active": True
            },
            sort=[("name", 1)]
        )
        
        # Format for frontend compatibility
        formatted_faculty = []
        for faculty in faculty_list:
            for subject in faculty["subjects"]:
                formatted_faculty.append({
                    "id": faculty["faculty_id"],
                    "name": faculty["name"],
                    "subject": subject,
                    "sections": faculty["sections"]
                })
        
        return APIResponse(
            success=True,
            message=f"Retrieved {len(formatted_faculty)} faculty-subject combinations for section {section.upper()}",
            data={"faculty": formatted_faculty}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving faculty by section: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving faculty by section"
        )

@router.get("/subjects/list", response_model=APIResponse)
async def get_all_subjects(admin: Any = Depends(get_current_admin)):
    """Get list of all unique subjects taught"""
    try:
        # Use aggregation to get unique subjects
        pipeline = [
            {"$match": {"is_active": True}},
            {"$unwind": "$subjects"},
            {"$group": {"_id": "$subjects"}},
            {"$sort": {"_id": 1}}
        ]
        
        result = await DatabaseOperations.aggregate("faculty", pipeline)
        subjects = [item["_id"] for item in result]
        
        return APIResponse(
            success=True,
            message=f"Retrieved {len(subjects)} unique subjects",
            data={"subjects": subjects}
        )
        
    except Exception as e:
        logger.error(f"Error retrieving subjects: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving subjects"
        )