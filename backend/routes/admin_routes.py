from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, timezone
from models import (
    Admin, AdminCreate, Department, DepartmentCreate, BatchYear, BatchYearCreate,
    BatchYearUpdate, APIResponse, UserRole, Section, SectionsUpdate
)
from database import DatabaseOperations
from auth import AuthService, AuthHelpers
import bcrypt

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin Management"])
security = HTTPBearer()

async def get_current_principal(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current principal user"""
    admin = await AuthService.get_current_admin(credentials.credentials)
    if not admin or admin.role != "principal":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Principal access required"
        )
    return admin

async def get_current_admin_or_hod(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current admin user (principal or HOD)"""
    admin = await AuthService.get_current_admin(credentials.credentials)
    if not admin or admin.role not in ["principal", "hod"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return admin

# HOD Management Endpoints
@router.post("/hods", response_model=APIResponse)
async def create_hod(
    hod_data: AdminCreate,
    principal: Any = Depends(get_current_principal)
):
    """Create a new HOD account with department assignment"""
    try:
        # Validate department exists
        if hod_data.department:
            department = await DatabaseOperations.find_one(
                "departments",
                {"code": hod_data.department.upper(), "is_active": True}
            )
            if not department:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Department not found"
                )
        
        # Check if username already exists
        existing_admin = await DatabaseOperations.find_one(
            "admins",
            {"username": hod_data.username}
        )
        if existing_admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        
        # Hash password
        password_hash = bcrypt.hashpw(
            hod_data.password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')
        
        # Create HOD admin record
        hod_admin = Admin(
            username=hod_data.username,
            password_hash=password_hash,
            name=hod_data.name,
            role=UserRole.HOD,
            email=hod_data.email,
            phone=hod_data.phone,
            department=hod_data.department
        )
        
        # Save to database
        hod_dict = hod_admin.dict()
        hod_dict["created_at"] = hod_admin.created_at
        hod_dict["updated_at"] = hod_admin.updated_at
        
        await DatabaseOperations.insert_one("admins", hod_dict)
        
        # Update department with HOD assignment
        if hod_data.department:
            await DatabaseOperations.update_one(
                "departments",
                {"code": hod_data.department.upper()},
                {"$set": {"hod_id": hod_admin.id}}
            )
        
        return APIResponse(
            success=True,
            message="HOD created successfully",
            data={"hod_id": hod_admin.id, "username": hod_admin.username}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating HOD: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating HOD"
        )

@router.get("/hods", response_model=APIResponse)
async def get_all_hods(
    department: Optional[str] = None,
    principal: Any = Depends(get_current_principal)
):
    """Get all HODs with optional department filter"""
    try:
        filter_dict = {"role": "hod", "is_active": True}
        if department:
            filter_dict["department"] = department.upper()
        
        hods = await DatabaseOperations.find_many("admins", filter_dict)
        
        # Remove password hash from response
        hod_list = []
        for hod in hods:
            hod_dict = {
                "id": hod["id"],
                "username": hod["username"],
                "name": hod["name"],
                "email": hod.get("email"),
                "phone": hod.get("phone"),
                "department": hod.get("department"),
                "is_active": hod.get("is_active", True),
                "created_at": hod["created_at"]
            }
            hod_list.append(hod_dict)
        
        return APIResponse(
            success=True,
            message="HODs retrieved successfully",
            data={"hods": hod_list}
        )
        
    except Exception as e:
        logger.error(f"Error retrieving HODs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving HODs"
        )

@router.put("/hods/{hod_id}", response_model=APIResponse)
async def update_hod(
    hod_id: str,
    hod_data: AdminCreate,
    principal: Any = Depends(get_current_principal)
):
    """Update HOD details"""
    try:
        # Check if HOD exists
        existing_hod = await DatabaseOperations.find_one(
            "admins",
            {"id": hod_id, "role": "hod"}
        )
        if not existing_hod:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="HOD not found"
            )
        
        # Validate department if provided
        if hod_data.department:
            department = await DatabaseOperations.find_one(
                "departments",
                {"code": hod_data.department.upper(), "is_active": True}
            )
            if not department:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Department not found"
                )
        
        # Check username uniqueness (excluding current HOD)
        if hod_data.username != existing_hod["username"]:
            existing_admin = await DatabaseOperations.find_one(
                "admins",
                {"username": hod_data.username, "id": {"$ne": hod_id}}
            )
            if existing_admin:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already exists"
                )
        
        # Hash password if provided
        update_data = {
            "username": hod_data.username,
            "name": hod_data.name,
            "email": hod_data.email,
            "phone": hod_data.phone,
            "department": hod_data.department,
            "updated_at": datetime.now(timezone.utc)
        }
        
        if hod_data.password:
            password_hash = bcrypt.hashpw(
                hod_data.password.encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')
            update_data["password_hash"] = password_hash
        
        # Update HOD
        await DatabaseOperations.update_one(
            "admins",
            {"id": hod_id},
            {"$set": update_data}
        )
        
        # Update department HOD assignment if changed
        if hod_data.department != existing_hod.get("department"):
            # Remove HOD from old department
            if existing_hod.get("department"):
                await DatabaseOperations.update_one(
                    "departments",
                    {"code": existing_hod["department"]},
                    {"$unset": {"hod_id": ""}}
                )
            
            # Assign HOD to new department
            if hod_data.department:
                await DatabaseOperations.update_one(
                    "departments",
                    {"code": hod_data.department.upper()},
                    {"$set": {"hod_id": hod_id}}
                )
        
        return APIResponse(
            success=True,
            message="HOD updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating HOD: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating HOD"
        )

@router.delete("/hods/{hod_id}", response_model=APIResponse)
async def deactivate_hod(
    hod_id: str,
    principal: Any = Depends(get_current_principal)
):
    """Deactivate HOD account"""
    try:
        # Check if HOD exists
        existing_hod = await DatabaseOperations.find_one(
            "admins",
            {"id": hod_id, "role": "hod"}
        )
        if not existing_hod:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="HOD not found"
            )
        
        # Deactivate HOD
        await DatabaseOperations.update_one(
            "admins",
            {"id": hod_id},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
        )
        
        # Remove HOD from department
        if existing_hod.get("department"):
            await DatabaseOperations.update_one(
                "departments",
                {"code": existing_hod["department"]},
                {"$unset": {"hod_id": ""}}
            )
        
        return APIResponse(
            success=True,
            message="HOD deactivated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating HOD: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deactivating HOD"
        )

# Department Management Endpoints
@router.post("/departments", response_model=APIResponse)
async def create_department(
    department_data: DepartmentCreate,
    principal: Any = Depends(get_current_principal)
):
    """Create a new department"""
    try:
        # Check if department code already exists
        existing_dept = await DatabaseOperations.find_one(
            "departments",
            {"code": department_data.code.upper()}
        )
        if existing_dept:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department code already exists"
            )
        
        # Create department
        department = Department(
            name=department_data.name,
            code=department_data.code.upper(),
            description=department_data.description
        )
        
        dept_dict = department.dict()
        dept_dict["created_at"] = department.created_at
        dept_dict["updated_at"] = department.updated_at
        
        await DatabaseOperations.insert_one("departments", dept_dict)
        
        return APIResponse(
            success=True,
            message="Department created successfully",
            data={"department_id": department.id, "code": department.code}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating department: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating department"
        )

@router.get("/departments", response_model=APIResponse)
async def get_all_departments(
    admin: Any = Depends(get_current_admin_or_hod)
):
    """Get all departments"""
    try:
        departments = await DatabaseOperations.find_many(
            "departments",
            {"is_active": True}
        )
        
        # Get HOD info for each department
        dept_list = []
        for dept in departments:
            hod_info = None
            if dept.get("hod_id"):
                hod = await DatabaseOperations.find_one(
                    "admins",
                    {"id": dept["hod_id"], "is_active": True}
                )
                if hod:
                    hod_info = {
                        "id": hod["id"],
                        "name": hod["name"],
                        "username": hod["username"]
                    }
            
            dept_dict = {
                "id": dept["id"],
                "name": dept["name"],
                "code": dept["code"],
                "description": dept.get("description"),
                "hod": hod_info,
                "created_at": dept["created_at"]
            }
            dept_list.append(dept_dict)
        
        return APIResponse(
            success=True,
            message="Departments retrieved successfully",
            data={"departments": dept_list}
        )
        
    except Exception as e:
        logger.error(f"Error retrieving departments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving departments"
        )

@router.put("/departments/{dept_id}", response_model=APIResponse)
async def update_department(
    dept_id: str,
    department_data: DepartmentCreate,
    principal: Any = Depends(get_current_principal)
):
    """Update department details"""
    try:
        # Check if department exists
        existing_dept = await DatabaseOperations.find_one(
            "departments",
            {"id": dept_id}
        )
        if not existing_dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )
        
        # Check code uniqueness (excluding current department)
        if department_data.code.upper() != existing_dept["code"]:
            existing_code = await DatabaseOperations.find_one(
                "departments",
                {"code": department_data.code.upper(), "id": {"$ne": dept_id}}
            )
            if existing_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Department code already exists"
                )
        
        # Update department
        update_data = {
            "name": department_data.name,
            "code": department_data.code.upper(),
            "description": department_data.description,
            "updated_at": datetime.now(timezone.utc)
        }
        
        await DatabaseOperations.update_one(
            "departments",
            {"id": dept_id},
            {"$set": update_data}
        )
        
        return APIResponse(
            success=True,
            message="Department updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating department: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating department"
        )

@router.delete("/departments/{dept_id}", response_model=APIResponse)
async def delete_department(
    dept_id: str,
    principal: Any = Depends(get_current_principal)
):
    """Soft delete a department"""
    try:
        # Check if department exists
        existing_dept = await DatabaseOperations.find_one(
            "departments",
            {"id": dept_id, "is_active": True}
        )
        if not existing_dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )
        
        # Check if department has active HODs
        active_hod = await DatabaseOperations.find_one(
            "admins",
            {"department": existing_dept["code"], "role": "hod", "is_active": True}
        )
        if active_hod:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete department with active HOD. Please deactivate HOD first."
            )
        
        # Check if department has active batch years
        active_batch = await DatabaseOperations.find_one(
            "batch_years",
            {"department": existing_dept["code"], "is_active": True}
        )
        if active_batch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete department with active batch years. Please delete batch years first."
            )
        
        # Soft delete department
        await DatabaseOperations.update_one(
            "departments",
            {"id": dept_id},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
        )
        
        return APIResponse(
            success=True,
            message="Department deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting department: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting department"
        )

# Batch Year Management Endpoints
@router.post("/batch-years", response_model=APIResponse)
async def create_batch_year(
    batch_data: BatchYearCreate,
    principal: Any = Depends(get_current_principal)
):
    """Create a new batch year for a department"""
    try:
        # Validate department exists
        department = await DatabaseOperations.find_one(
            "departments",
            {"code": batch_data.department.upper(), "is_active": True}
        )
        if not department:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Department not found"
            )
        
        # Check if batch year already exists for this department
        existing_batch = await DatabaseOperations.find_one(
            "batch_years",
            {
                "year_range": batch_data.year_range,
                "department": batch_data.department.upper()
            }
        )
        if existing_batch:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Batch year already exists for this department"
            )
        
        # Create batch year
        batch_year = BatchYear(
            year_range=batch_data.year_range,
            department=batch_data.department.upper(),
            sections=batch_data.sections
        )
        
        batch_dict = batch_year.dict()
        batch_dict["created_at"] = batch_year.created_at
        batch_dict["updated_at"] = batch_year.updated_at
        
        await DatabaseOperations.insert_one("batch_years", batch_dict)
        
        return APIResponse(
            success=True,
            message="Batch year created successfully",
            data={"batch_id": batch_year.id, "year_range": batch_year.year_range}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating batch year: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating batch year"
        )

@router.get("/batch-years", response_model=APIResponse)
async def get_all_batch_years(
    department: Optional[str] = None,
    admin: Any = Depends(get_current_admin_or_hod)
):
    """Get all batch years with optional department filter"""
    try:
        filter_dict = {"is_active": True}
        if department:
            filter_dict["department"] = department.upper()
        
        batch_years = await DatabaseOperations.find_many("batch_years", filter_dict)
        
        batch_list = []
        for batch in batch_years:
            batch_dict = {
                "id": batch["id"],
                "year_range": batch["year_range"],
                "department": batch["department"],
                "sections": batch["sections"],
                "created_at": batch["created_at"]
            }
            batch_list.append(batch_dict)
        
        return APIResponse(
            success=True,
            message="Batch years retrieved successfully",
            data={"batch_years": batch_list}
        )
        
    except Exception as e:
        logger.error(f"Error retrieving batch years: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving batch years"
        )

@router.post("/batch-years/{batch_id}/sections", response_model=APIResponse)
async def add_sections_to_batch_year(
    batch_id: str,
    sections_data: SectionsUpdate,
    principal: Any = Depends(get_current_principal)
):
    """Add sections to a batch year"""
    try:
        # Check if batch year exists
        existing_batch = await DatabaseOperations.find_one(
            "batch_years",
            {"id": batch_id, "is_active": True}
        )
        if not existing_batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch year not found"
            )
        
        # Update sections
        await DatabaseOperations.update_one(
            "batch_years",
            {"id": batch_id},
            {
                "$set": {
                    "sections": sections_data.sections,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return APIResponse(
            success=True,
            message="Sections added to batch year successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding sections to batch year: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error adding sections to batch year"
        )

@router.put("/batch-years/{batch_id}", response_model=APIResponse)
async def update_batch_year(
    batch_id: str,
    batch_data: BatchYearUpdate,
    principal: Any = Depends(get_current_principal)
):
    """Update batch year details including sections"""
    try:
        # Check if batch year exists
        existing_batch = await DatabaseOperations.find_one(
            "batch_years",
            {"id": batch_id, "is_active": True}
        )
        if not existing_batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch year not found"
            )
        
        # Validate department if provided
        if batch_data.department:
            department = await DatabaseOperations.find_one(
                "departments",
                {"code": batch_data.department.upper(), "is_active": True}
            )
            if not department:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Department not found"
                )
        
        # Check for duplicate batch years (excluding current)
        if batch_data.year_range or batch_data.department:
            year_range = batch_data.year_range or existing_batch["year_range"]
            department_code = batch_data.department or existing_batch["department"]
            
            duplicate_batch = await DatabaseOperations.find_one(
                "batch_years",
                {
                    "year_range": year_range,
                    "department": department_code.upper(),
                    "id": {"$ne": batch_id}
                }
            )
            if duplicate_batch:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Batch year already exists for this department"
                )
        
        # Prepare update data
        update_data = {"updated_at": datetime.now(timezone.utc)}
        if batch_data.year_range:
            update_data["year_range"] = batch_data.year_range
        if batch_data.department:
            update_data["department"] = batch_data.department.upper()
        if batch_data.sections is not None:
            update_data["sections"] = batch_data.sections
        
        # Update batch year
        await DatabaseOperations.update_one(
            "batch_years",
            {"id": batch_id},
            {"$set": update_data}
        )
        
        return APIResponse(
            success=True,
            message="Batch year updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating batch year: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating batch year"
        )

@router.get("/departments/{dept_id}/sections", response_model=APIResponse)
async def get_department_sections(
    dept_id: str,
    principal: Any = Depends(get_current_principal)
):
    """Get all sections for a department across all batch years"""
    try:
        # Get department info
        department = await DatabaseOperations.find_one(
            "departments",
            {"id": dept_id, "is_active": True}
        )
        if not department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )
        
        # Get all batch years for this department
        batch_years = await DatabaseOperations.find_many(
            "batch_years",
            {"department": department["code"], "is_active": True}
        )
        
        # Collect all sections with their batch year info
        sections_info = []
        for batch in batch_years:
            for section in batch["sections"]:
                sections_info.append({
                    "section": section,
                    "batch_year": batch["year_range"],
                    "batch_id": batch["id"]
                })
        
        return APIResponse(
            success=True,
            message="Department sections retrieved successfully",
            data={
                "department": department["name"],
                "sections": sections_info
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving department sections: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving department sections"
        )
