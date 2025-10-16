from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Any, Optional
import pandas as pd
import io
import logging
from models import (
    Student, StudentCreate, StudentImport, StudentResponse, 
    APIResponse, ImportResult, Section
)
from database import DatabaseOperations
from auth import AuthService
from pagination import PaginationParams, PaginationHelper, get_pagination_params
from field_selection import get_field_selection, apply_field_selection_to_list, FieldSelector
from bulk_operations import BulkOperationsHelper, BulkCreateRequest, BulkUpdateRequest, BulkDeleteRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/students", tags=["Students"])
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

@router.get("/", response_model=APIResponse)
async def get_all_students(
    section: Optional[str] = None,
    department: Optional[str] = None,
    batch_year: Optional[str] = None,
    pagination: PaginationParams = Depends(get_pagination_params),
    fields: Optional[List[str]] = Depends(get_field_selection),
    admin: Any = Depends(get_current_admin)
):
    """Get all students with optional filters, pagination, and field selection"""
    try:
        filter_dict = {"is_active": True}
        if section:
            filter_dict["section"] = section
        if department:
            filter_dict["department"] = department.upper()
        if batch_year:
            filter_dict["batch_year"] = batch_year
        
        # Get total count
        total = await DatabaseOperations.count_documents("students", filter_dict)
        
        # Get students with pagination
        skip = PaginationHelper.get_skip(pagination.page, pagination.limit)
        sort_dict = PaginationHelper.create_sort_dict(pagination.sort_by, pagination.sort_order)
        
        students = await DatabaseOperations.find_many(
            "students", 
            filter_dict=filter_dict,
            limit=pagination.limit,
            skip=skip,
            sort=sort_dict
        )
        
        # Apply field selection
        if fields:
            fields = FieldSelector.validate_fields(fields, "students")
            students = apply_field_selection_to_list(students, fields)
        else:
            # Use default fields
            default_fields = FieldSelector.get_default_fields("students")
            students = apply_field_selection_to_list(students, default_fields)
        
        # Create paginated response
        paginated_response = PaginationHelper.create_paginated_response(
            data=students,
            total=total,
            page=pagination.page,
            limit=pagination.limit
        )
        
        return APIResponse(
            success=True,
            message=f"Retrieved {len(students)} students",
            data=paginated_response.dict()
        )
        
    except Exception as e:
        logger.error(f"Error retrieving students: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving students"
        )

@router.get("/{student_id}", response_model=APIResponse)
async def get_student(
    student_id: str,
    admin: Any = Depends(get_current_admin)
):
    """Get student by ID"""
    try:
        student = await DatabaseOperations.find_one("students", {"id": student_id})
        
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        student_response = StudentResponse(
            id=student["id"],
            reg_number=student["reg_number"],
            name=student["name"],
            section=student["section"],
            email=student.get("email"),
            year=student.get("year"),
            branch=student.get("branch")
        )
        
        return APIResponse(
            success=True,
            message="Student retrieved successfully",
            data={"student": student_response}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving student: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving student"
        )

@router.post("/", response_model=APIResponse)
async def create_student(
    student_data: StudentCreate,
    admin: Any = Depends(get_current_admin)
):
    """Create a new student"""
    try:
        # Check if student already exists
        existing_student = await DatabaseOperations.find_one(
            "students", 
            {"reg_number": student_data.reg_number.upper()}
        )
        
        if existing_student:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student with this registration number already exists"
            )
        
        # Create student document
        import uuid
        student_doc = student_data.dict()
        student_doc["id"] = str(uuid.uuid4())  # Add UUID id field
        student_doc["reg_number"] = student_doc["reg_number"].upper()
        student_doc["is_active"] = True
        
        student_id = await DatabaseOperations.insert_one("students", student_doc)
        
        return APIResponse(
            success=True,
            message="Student created successfully",
            data={"student_id": student_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating student: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating student"
        )

@router.put("/{student_id}", response_model=APIResponse)
async def update_student(
    student_id: str,
    student_data: StudentCreate,
    admin: Any = Depends(get_current_admin)
):
    """Update student information"""
    try:
        # Check if student exists
        existing_student = await DatabaseOperations.find_one("students", {"id": student_id})
        
        if not existing_student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        # Check for duplicate registration number (excluding current student)
        duplicate_student = await DatabaseOperations.find_one(
            "students",
            {
                "reg_number": student_data.reg_number.upper(),
                "id": {"$ne": student_id}
            }
        )
        
        if duplicate_student:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Another student with this registration number already exists"
            )
        
        # Update student
        update_dict = student_data.dict()
        update_dict["reg_number"] = update_dict["reg_number"].upper()
        
        updated = await DatabaseOperations.update_one(
            "students",
            {"id": student_id},
            update_dict
        )
        
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update student"
            )
        
        return APIResponse(
            success=True,
            message="Student updated successfully",
            data=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating student: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating student"
        )

@router.delete("/{student_id}", response_model=APIResponse)
async def delete_student(
    student_id: str,
    admin: Any = Depends(get_current_admin)
):
    """Hard delete student (permanently remove from database)"""
    try:
        deleted = await DatabaseOperations.delete_by_id("students", student_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student not found"
            )
        
        return APIResponse(
            success=True,
            message="Student deleted successfully",
            data=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting student: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting student"
        )

@router.post("/import", response_model=APIResponse)
async def import_students(
    student_import: StudentImport,
    admin: Any = Depends(get_current_admin)
):
    """Import multiple students from JSON data"""
    try:
        success_count = 0
        error_count = 0
        errors = []
        
        for i, student_data in enumerate(student_import.students):
            try:
                # Check for duplicate
                existing_student = await DatabaseOperations.find_one(
                    "students",
                    {"reg_number": student_data.reg_number.upper()}
                )
                
                if existing_student:
                    errors.append(f"Row {i+1}: Student {student_data.reg_number} already exists")
                    error_count += 1
                    continue
                
                # Create student document
                import uuid
                student_doc = student_data.dict()
                student_doc["id"] = str(uuid.uuid4())  # Add UUID id field
                student_doc["reg_number"] = student_doc["reg_number"].upper()
                student_doc["is_active"] = True
                
                await DatabaseOperations.insert_one("students", student_doc)
                success_count += 1
                
            except Exception as e:
                errors.append(f"Row {i+1}: {str(e)}")
                error_count += 1
        
        result = ImportResult(
            success_count=success_count,
            error_count=error_count,
            errors=errors,
            warnings=[],
            total_processed=len(student_import.students)
        )
        
        return APIResponse(
            success=True,
            message=f"Import completed: {success_count} successful, {error_count} errors",
            data=result.dict()
        )
        
    except Exception as e:
        logger.error(f"Error importing students: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error importing students"
        )

@router.post("/import/csv", response_model=APIResponse)
async def import_students_csv(
    file: UploadFile = File(...),
    admin: Any = Depends(get_current_admin)
):
    """Import students from CSV file"""
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
        required_columns = ['reg_number', 'name', 'section', 'dob']
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
                # Validate section
                section = str(row['section']).strip().upper()
                if section not in ['A', 'B']:
                    errors.append(f"Row {index+1}: Invalid section '{section}'. Must be A or B")
                    error_count += 1
                    continue
                
                # Check for duplicate
                reg_number = str(row['reg_number']).strip().upper()
                existing_student = await DatabaseOperations.find_one(
                    "students",
                    {"reg_number": reg_number}
                )
                
                if existing_student:
                    errors.append(f"Row {index+1}: Student {reg_number} already exists")
                    error_count += 1
                    continue
                
                # Create student document
                import uuid
                student_doc = {
                    "id": str(uuid.uuid4()),  # Add UUID id field
                    "reg_number": reg_number,
                    "name": str(row['name']).strip(),
                    "section": section,
                    "dob": str(row['dob']).strip(),
                    "email": str(row.get('email', '')).strip() if pd.notna(row.get('email')) else None,
                    "phone": str(row.get('phone', '')).strip() if pd.notna(row.get('phone')) else None,
                    "year": str(row.get('year', '')).strip() if pd.notna(row.get('year')) else None,
                    "branch": str(row.get('branch', '')).strip() if pd.notna(row.get('branch')) else None,
                    "is_active": True
                }
                
                await DatabaseOperations.insert_one("students", student_doc)
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

@router.get("/sections/summary", response_model=APIResponse)
async def get_section_summary(admin: Any = Depends(get_current_admin)):
    """Get summary of students by section"""
    try:
        section_a_count = await DatabaseOperations.count_documents(
            "students", 
            {"section": "A", "is_active": True}
        )
        section_b_count = await DatabaseOperations.count_documents(
            "students",
            {"section": "B", "is_active": True}
        )
        
        total_students = section_a_count + section_b_count
        
        summary = {
            "total_students": total_students,
            "section_a": section_a_count,
            "section_b": section_b_count,
            "sections": [
                {"section": "A", "count": section_a_count},
                {"section": "B", "count": section_b_count}
            ]
        }
        
        return APIResponse(
            success=True,
            message="Section summary retrieved successfully",
            data=summary
        )
        
    except Exception as e:
        logger.error(f"Error getting section summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving section summary"
        )

@router.post("/bulk-create", response_model=APIResponse)
async def bulk_create_students(
    request: BulkCreateRequest,
    admin: Any = Depends(get_current_admin)
):
    """Bulk create students"""
    try:
        result = await BulkOperationsHelper.bulk_create(
            "students",
            request.items,
            validate_func=lambda item: []  # Add validation if needed
        )
        
        return APIResponse(
            success=result.success,
            message=f"Bulk create completed: {result.successful} successful, {result.failed} failed",
            data=result.dict()
        )
        
    except Exception as e:
        logger.error(f"Bulk create error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk create failed"
        )

@router.put("/bulk-update", response_model=APIResponse)
async def bulk_update_students(
    request: BulkUpdateRequest,
    admin: Any = Depends(get_current_admin)
):
    """Bulk update students"""
    try:
        result = await BulkOperationsHelper.bulk_update(
            "students",
            request.updates,
            validate_func=lambda item: []  # Add validation if needed
        )
        
        return APIResponse(
            success=result.success,
            message=f"Bulk update completed: {result.successful} successful, {result.failed} failed",
            data=result.dict()
        )
        
    except Exception as e:
        logger.error(f"Bulk update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk update failed"
        )

@router.delete("/bulk-delete", response_model=APIResponse)
async def bulk_delete_students(
    request: BulkDeleteRequest,
    admin: Any = Depends(get_current_admin)
):
    """Bulk delete students (hard delete)"""
    try:
        result = await BulkOperationsHelper.bulk_delete(
            "students",
            request.ids,
            soft_delete=False
        )
        
        return APIResponse(
            success=result.success,
            message=f"Bulk delete completed: {result.successful} successful, {result.failed} failed",
            data=result.dict()
        )
        
    except Exception as e:
        logger.error(f"Bulk delete error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk delete failed"
        )