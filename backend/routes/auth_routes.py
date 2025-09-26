from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any
from models import AdminLogin, StudentLogin, LoginResponse, APIResponse
from auth import AuthService, AuthHelpers
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)

@router.post("/admin/login", response_model=APIResponse)
async def admin_login(credentials: AdminLogin):
    """Admin login endpoint for HOD and Principal"""
    try:
        # Authenticate admin
        admin = await AuthService.authenticate_admin(
            credentials.username, 
            credentials.password
        )
        
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Create access token
        access_token = AuthService.create_access_token(
            data={"sub": admin.id, "role": admin.role}
        )
        
        # Create user response
        user_data = AuthHelpers.create_user_response(admin.dict(), admin.role)
        
        return APIResponse(
            success=True,
            message="Login successful",
            data={
                "user": user_data,
                "access_token": access_token,
                "token_type": "bearer"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login"
        )

@router.post("/student/login", response_model=APIResponse)
async def student_login(credentials: StudentLogin):
    """Student login endpoint using registration number and DOB"""
    try:
        # Authenticate student
        student = await AuthService.authenticate_student(
            credentials.reg_number,
            credentials.dob
        )
        
        if not student:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid registration number or date of birth"
            )
        
        # Create access token
        access_token = AuthService.create_access_token(
            data={"sub": student.id, "role": "student"}
        )
        
        # Create user response
        user_data = AuthHelpers.create_user_response(student.dict(), "student")
        
        return APIResponse(
            success=True,
            message="Login successful",
            data={
                "user": user_data,
                "access_token": access_token,
                "token_type": "bearer"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Student login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login"
        )

@router.post("/verify-token", response_model=APIResponse)
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return user info"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided"
        )
    
    try:
        # Decode token
        payload = AuthService.decode_access_token(credentials.credentials)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        user_id = payload.get("sub")
        user_role = payload.get("role")
        
        if not user_id or not user_role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        # Get user based on role
        if user_role in ["hod", "principal"]:
            user = await AuthService.get_current_admin(credentials.credentials)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Admin user not found"
                )
            user_data = AuthHelpers.create_user_response(user.dict(), user.role)
        else:  # student
            user = await AuthService.get_current_student(credentials.credentials)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Student user not found"
                )
            user_data = AuthHelpers.create_user_response(user.dict(), "student")
        
        return APIResponse(
            success=True,
            message="Token is valid",
            data={"user": user_data}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during token verification"
        )

@router.post("/logout", response_model=APIResponse)
async def logout():
    """Logout endpoint (token invalidation handled on client side)"""
    return APIResponse(
        success=True,
        message="Logged out successfully",
        data=None
    )