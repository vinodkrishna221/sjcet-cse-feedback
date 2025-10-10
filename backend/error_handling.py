"""
Comprehensive error handling system with error codes and internationalization
"""
import logging
from typing import Dict, Any, Optional, List
from enum import Enum
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.requests import Request
import traceback
import os

logger = logging.getLogger(__name__)

class ErrorCode(str, Enum):
    """Standardized error codes"""
    # Authentication & Authorization
    AUTH_INVALID_CREDENTIALS = "AUTH_001"
    AUTH_TOKEN_EXPIRED = "AUTH_002"
    AUTH_TOKEN_INVALID = "AUTH_003"
    AUTH_INSUFFICIENT_PERMISSIONS = "AUTH_004"
    AUTH_ACCOUNT_LOCKED = "AUTH_005"
    AUTH_ACCOUNT_INACTIVE = "AUTH_006"
    
    # Validation Errors
    VALIDATION_REQUIRED_FIELD = "VAL_001"
    VALIDATION_INVALID_FORMAT = "VAL_002"
    VALIDATION_VALUE_TOO_LONG = "VAL_003"
    VALIDATION_VALUE_TOO_SHORT = "VAL_004"
    VALIDATION_INVALID_RANGE = "VAL_005"
    VALIDATION_DUPLICATE_VALUE = "VAL_006"
    VALIDATION_INVALID_EMAIL = "VAL_007"
    VALIDATION_INVALID_PHONE = "VAL_008"
    VALIDATION_INVALID_DATE = "VAL_009"
    
    # Business Logic Errors
    BUSINESS_STUDENT_NOT_FOUND = "BIZ_001"
    BUSINESS_FACULTY_NOT_FOUND = "BIZ_002"
    BUSINESS_FEEDBACK_ALREADY_SUBMITTED = "BIZ_003"
    BUSINESS_FACULTY_NOT_TEACHES_SUBJECT = "BIZ_004"
    BUSINESS_FACULTY_NOT_TEACHES_SECTION = "BIZ_005"
    BUSINESS_DEPARTMENT_NOT_FOUND = "BIZ_006"
    BUSINESS_BATCH_YEAR_NOT_FOUND = "BIZ_007"
    BUSINESS_FEEDBACK_PERIOD_CLOSED = "BIZ_008"
    
    # Database Errors
    DB_CONNECTION_FAILED = "DB_001"
    DB_QUERY_FAILED = "DB_002"
    DB_CONSTRAINT_VIOLATION = "DB_003"
    DB_TRANSACTION_FAILED = "DB_004"
    DB_DUPLICATE_KEY = "DB_005"
    
    # File Operations
    FILE_UPLOAD_FAILED = "FILE_001"
    FILE_INVALID_FORMAT = "FILE_002"
    FILE_SIZE_TOO_LARGE = "FILE_003"
    FILE_PARSING_FAILED = "FILE_004"
    
    # Rate Limiting
    RATE_LIMIT_EXCEEDED = "RATE_001"
    
    # System Errors
    SYSTEM_INTERNAL_ERROR = "SYS_001"
    SYSTEM_SERVICE_UNAVAILABLE = "SYS_002"
    SYSTEM_MAINTENANCE_MODE = "SYS_003"
    SYSTEM_CONFIGURATION_ERROR = "SYS_004"

class ErrorMessage:
    """Error message templates with internationalization support"""
    
    MESSAGES = {
        # English (default)
        "en": {
            ErrorCode.AUTH_INVALID_CREDENTIALS: "Invalid username or password",
            ErrorCode.AUTH_TOKEN_EXPIRED: "Authentication token has expired",
            ErrorCode.AUTH_TOKEN_INVALID: "Invalid authentication token",
            ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS: "Insufficient permissions for this operation",
            ErrorCode.AUTH_ACCOUNT_LOCKED: "Account is locked due to multiple failed login attempts",
            ErrorCode.AUTH_ACCOUNT_INACTIVE: "Account is inactive",
            
            ErrorCode.VALIDATION_REQUIRED_FIELD: "Field '{field}' is required",
            ErrorCode.VALIDATION_INVALID_FORMAT: "Field '{field}' has invalid format",
            ErrorCode.VALIDATION_VALUE_TOO_LONG: "Field '{field}' is too long (max {max_length} characters)",
            ErrorCode.VALIDATION_VALUE_TOO_SHORT: "Field '{field}' is too short (min {min_length} characters)",
            ErrorCode.VALIDATION_INVALID_RANGE: "Field '{field}' value is out of range",
            ErrorCode.VALIDATION_DUPLICATE_VALUE: "Field '{field}' value already exists",
            ErrorCode.VALIDATION_INVALID_EMAIL: "Invalid email format",
            ErrorCode.VALIDATION_INVALID_PHONE: "Invalid phone number format",
            ErrorCode.VALIDATION_INVALID_DATE: "Invalid date format",
            
            ErrorCode.BUSINESS_STUDENT_NOT_FOUND: "Student not found",
            ErrorCode.BUSINESS_FACULTY_NOT_FOUND: "Faculty member not found",
            ErrorCode.BUSINESS_FEEDBACK_ALREADY_SUBMITTED: "Feedback already submitted for this semester",
            ErrorCode.BUSINESS_FACULTY_NOT_TEACHES_SUBJECT: "Faculty does not teach this subject",
            ErrorCode.BUSINESS_FACULTY_NOT_TEACHES_SECTION: "Faculty does not teach this section",
            ErrorCode.BUSINESS_DEPARTMENT_NOT_FOUND: "Department not found",
            ErrorCode.BUSINESS_BATCH_YEAR_NOT_FOUND: "Batch year not found",
            ErrorCode.BUSINESS_FEEDBACK_PERIOD_CLOSED: "Feedback submission period is closed",
            
            ErrorCode.DB_CONNECTION_FAILED: "Database connection failed",
            ErrorCode.DB_QUERY_FAILED: "Database query failed",
            ErrorCode.DB_CONSTRAINT_VIOLATION: "Database constraint violation",
            ErrorCode.DB_TRANSACTION_FAILED: "Database transaction failed",
            ErrorCode.DB_DUPLICATE_KEY: "Duplicate key violation",
            
            ErrorCode.FILE_UPLOAD_FAILED: "File upload failed",
            ErrorCode.FILE_INVALID_FORMAT: "Invalid file format",
            ErrorCode.FILE_SIZE_TOO_LARGE: "File size too large (max {max_size} MB)",
            ErrorCode.FILE_PARSING_FAILED: "File parsing failed",
            
            ErrorCode.RATE_LIMIT_EXCEEDED: "Rate limit exceeded. Please try again later",
            
            ErrorCode.SYSTEM_INTERNAL_ERROR: "Internal server error",
            ErrorCode.SYSTEM_SERVICE_UNAVAILABLE: "Service temporarily unavailable",
            ErrorCode.SYSTEM_MAINTENANCE_MODE: "System is under maintenance",
            ErrorCode.SYSTEM_CONFIGURATION_ERROR: "System configuration error",
        },
        
        # Hindi (example)
        "hi": {
            ErrorCode.AUTH_INVALID_CREDENTIALS: "अमान्य उपयोगकर्ता नाम या पासवर्ड",
            ErrorCode.AUTH_TOKEN_EXPIRED: "प्रमाणीकरण टोकन समाप्त हो गया है",
            ErrorCode.AUTH_TOKEN_INVALID: "अमान्य प्रमाणीकरण टोकन",
            ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS: "इस ऑपरेशन के लिए अपर्याप्त अनुमतियां",
            ErrorCode.AUTH_ACCOUNT_LOCKED: "कई असफल लॉगिन प्रयासों के कारण खाता लॉक है",
            ErrorCode.AUTH_ACCOUNT_INACTIVE: "खाता निष्क्रिय है",
            
            ErrorCode.VALIDATION_REQUIRED_FIELD: "फ़ील्ड '{field}' आवश्यक है",
            ErrorCode.VALIDATION_INVALID_FORMAT: "फ़ील्ड '{field}' का अमान्य प्रारूप है",
            ErrorCode.VALIDATION_VALUE_TOO_LONG: "फ़ील्ड '{field}' बहुत लंबा है (अधिकतम {max_length} वर्ण)",
            ErrorCode.VALIDATION_VALUE_TOO_SHORT: "फ़ील्ड '{field}' बहुत छोटा है (न्यूनतम {min_length} वर्ण)",
            ErrorCode.VALIDATION_INVALID_RANGE: "फ़ील्ड '{field}' मान सीमा से बाहर है",
            ErrorCode.VALIDATION_DUPLICATE_VALUE: "फ़ील्ड '{field}' मान पहले से मौजूद है",
            ErrorCode.VALIDATION_INVALID_EMAIL: "अमान्य ईमेल प्रारूप",
            ErrorCode.VALIDATION_INVALID_PHONE: "अमान्य फोन नंबर प्रारूप",
            ErrorCode.VALIDATION_INVALID_DATE: "अमान्य दिनांक प्रारूप",
            
            ErrorCode.BUSINESS_STUDENT_NOT_FOUND: "छात्र नहीं मिला",
            ErrorCode.BUSINESS_FACULTY_NOT_FOUND: "संकाय सदस्य नहीं मिला",
            ErrorCode.BUSINESS_FEEDBACK_ALREADY_SUBMITTED: "इस सेमेस्टर के लिए फीडबैक पहले से ही जमा किया गया है",
            ErrorCode.BUSINESS_FACULTY_NOT_TEACHES_SUBJECT: "संकाय इस विषय को नहीं पढ़ाता",
            ErrorCode.BUSINESS_FACULTY_NOT_TEACHES_SECTION: "संकाय इस अनुभाग को नहीं पढ़ाता",
            ErrorCode.BUSINESS_DEPARTMENT_NOT_FOUND: "विभाग नहीं मिला",
            ErrorCode.BUSINESS_BATCH_YEAR_NOT_FOUND: "बैच वर्ष नहीं मिला",
            ErrorCode.BUSINESS_FEEDBACK_PERIOD_CLOSED: "फीडबैक जमा करने की अवधि बंद है",
            
            ErrorCode.DB_CONNECTION_FAILED: "डेटाबेस कनेक्शन विफल",
            ErrorCode.DB_QUERY_FAILED: "डेटाबेस क्वेरी विफल",
            ErrorCode.DB_CONSTRAINT_VIOLATION: "डेटाबेस बाधा उल्लंघन",
            ErrorCode.DB_TRANSACTION_FAILED: "डेटाबेस लेनदेन विफल",
            ErrorCode.DB_DUPLICATE_KEY: "डुप्लिकेट कुंजी उल्लंघन",
            
            ErrorCode.FILE_UPLOAD_FAILED: "फ़ाइल अपलोड विफल",
            ErrorCode.FILE_INVALID_FORMAT: "अमान्य फ़ाइल प्रारूप",
            ErrorCode.FILE_SIZE_TOO_LARGE: "फ़ाइल आकार बहुत बड़ा है (अधिकतम {max_size} MB)",
            ErrorCode.FILE_PARSING_FAILED: "फ़ाइल पार्सिंग विफल",
            
            ErrorCode.RATE_LIMIT_EXCEEDED: "दर सीमा पार हो गई। कृपया बाद में पुनः प्रयास करें",
            
            ErrorCode.SYSTEM_INTERNAL_ERROR: "आंतरिक सर्वर त्रुटि",
            ErrorCode.SYSTEM_SERVICE_UNAVAILABLE: "सेवा अस्थायी रूप से अनुपलब्ध",
            ErrorCode.SYSTEM_MAINTENANCE_MODE: "सिस्टम रखरखाव में है",
            ErrorCode.SYSTEM_CONFIGURATION_ERROR: "सिस्टम कॉन्फ़िगरेशन त्रुटि",
        }
    }
    
    @classmethod
    def get_message(cls, error_code: ErrorCode, language: str = "en", **kwargs) -> str:
        """Get localized error message"""
        messages = cls.MESSAGES.get(language, cls.MESSAGES["en"])
        message = messages.get(error_code, str(error_code))
        
        # Format message with provided parameters
        try:
            return message.format(**kwargs)
        except KeyError:
            return message

class APIError(HTTPException):
    """Custom API error with error codes"""
    
    def __init__(
        self,
        error_code: ErrorCode,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        language: str = "en"
    ):
        self.error_code = error_code
        self.language = language
        
        if message is None:
            message = ErrorMessage.get_message(error_code, language)
        
        self.details = details or {}
        
        super().__init__(
            status_code=status_code,
            detail={
                "error_code": error_code.value,
                "message": message,
                "details": self.details
            }
        )

class ErrorHandler:
    """Centralized error handling"""
    
    @staticmethod
    def create_error_response(
        error_code: ErrorCode,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        language: str = "en"
    ) -> JSONResponse:
        """Create standardized error response"""
        if message is None:
            message = ErrorMessage.get_message(error_code, language)
        
        return JSONResponse(
            status_code=status_code,
            content={
                "success": False,
                "error_code": error_code.value,
                "message": message,
                "details": details or {}
            }
        )
    
    @staticmethod
    def handle_validation_error(field: str, error_type: str, **kwargs) -> APIError:
        """Handle validation errors"""
        error_code_map = {
            "required": ErrorCode.VALIDATION_REQUIRED_FIELD,
            "invalid_format": ErrorCode.VALIDATION_INVALID_FORMAT,
            "too_long": ErrorCode.VALIDATION_VALUE_TOO_LONG,
            "too_short": ErrorCode.VALIDATION_VALUE_TOO_SHORT,
            "invalid_range": ErrorCode.VALIDATION_INVALID_RANGE,
            "duplicate": ErrorCode.VALIDATION_DUPLICATE_VALUE,
            "invalid_email": ErrorCode.VALIDATION_INVALID_EMAIL,
            "invalid_phone": ErrorCode.VALIDATION_INVALID_PHONE,
            "invalid_date": ErrorCode.VALIDATION_INVALID_DATE,
        }
        
        error_code = error_code_map.get(error_type, ErrorCode.VALIDATION_INVALID_FORMAT)
        return APIError(
            error_code=error_code,
            message=ErrorMessage.get_message(error_code, field=field, **kwargs)
        )
    
    @staticmethod
    def handle_database_error(error: Exception) -> APIError:
        """Handle database errors"""
        error_str = str(error).lower()
        
        if "duplicate key" in error_str or "duplicate entry" in error_str:
            return APIError(ErrorCode.DB_DUPLICATE_KEY)
        elif "constraint" in error_str:
            return APIError(ErrorCode.DB_CONSTRAINT_VIOLATION)
        elif "connection" in error_str:
            return APIError(ErrorCode.DB_CONNECTION_FAILED)
        else:
            return APIError(ErrorCode.DB_QUERY_FAILED)
    
    @staticmethod
    def handle_file_error(error: Exception, file_type: str = None) -> APIError:
        """Handle file operation errors"""
        error_str = str(error).lower()
        
        if "size" in error_str or "too large" in error_str:
            return APIError(ErrorCode.FILE_SIZE_TOO_LARGE)
        elif "format" in error_str or "invalid" in error_str:
            return APIError(ErrorCode.FILE_INVALID_FORMAT)
        elif "parse" in error_str or "parsing" in error_str:
            return APIError(ErrorCode.FILE_PARSING_FAILED)
        else:
            return APIError(ErrorCode.FILE_UPLOAD_FAILED)

async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global exception handler"""
    # Log the error
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    # Check if it's already an APIError
    if isinstance(exc, APIError):
        return ErrorHandler.create_error_response(
            error_code=exc.error_code,
            status_code=exc.status_code,
            message=exc.detail.get("message") if isinstance(exc.detail, dict) else str(exc.detail),
            details=exc.details,
            language=exc.language
        )
    
    # Handle specific exception types
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error_code": "HTTP_ERROR",
                "message": exc.detail,
                "details": {}
            }
        )
    
    # Handle database errors
    if "pymongo" in str(type(exc)) or "motor" in str(type(exc)):
        api_error = ErrorHandler.handle_database_error(exc)
        return ErrorHandler.create_error_response(
            error_code=api_error.error_code,
            status_code=api_error.status_code,
            message=api_error.detail.get("message"),
            details=api_error.details
        )
    
    # Handle file errors
    if "pandas" in str(type(exc)) or "openpyxl" in str(type(exc)):
        api_error = ErrorHandler.handle_file_error(exc)
        return ErrorHandler.create_error_response(
            error_code=api_error.error_code,
            status_code=api_error.status_code,
            message=api_error.detail.get("message"),
            details=api_error.details
        )
    
    # Default error response
    return ErrorHandler.create_error_response(
        error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message="An unexpected error occurred"
    )
