from pydantic import BaseModel, Field, field_validator, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid
import re

# Enums
class UserRole(str, Enum):
    STUDENT = "student"
    HOD = "hod"
    PRINCIPAL = "principal"

class Section(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"

# Base Models
class BaseDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    updated_at: datetime = Field(default_factory=lambda: datetime.now())

# Admin/Authentication Models
class Admin(BaseDocument):
    username: str = Field(..., min_length=3, max_length=50)
    password_hash: str  # Will store hashed password
    name: str = Field(..., min_length=2, max_length=100)
    role: UserRole
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v and not re.match(r'^\+?[\d\s\-\(\)]{10,15}$', v):
            raise ValueError('Invalid phone number format')
        return v

class AdminCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=100)
    name: str = Field(..., min_length=2, max_length=100)
    role: UserRole
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        return v
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v and not re.match(r'^\+?[\d\s\-\(\)]{10,15}$', v):
            raise ValueError('Invalid phone number format')
        return v

class AdminLogin(BaseModel):
    username: str
    password: str

# Student Models
class Student(BaseDocument):
    reg_number: str = Field(..., min_length=5, max_length=20)
    name: str = Field(..., min_length=2, max_length=100)
    section: Section
    dob: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')  # Format: YYYY-MM-DD
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    year: Optional[str] = None
    branch: Optional[str] = None
    is_active: bool = True
    
    @field_validator('reg_number')
    @classmethod
    def validate_reg_number(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Registration number cannot be empty')
        if not re.match(r'^[A-Z0-9]+$', v.strip().upper()):
            raise ValueError('Registration number must contain only letters and numbers')
        return v.strip().upper()
    
    @field_validator('dob')
    @classmethod
    def validate_dob(cls, v):
        try:
            datetime.strptime(v, '%Y-%m-%d')
            # Check if date is reasonable (not in future, not too old)
            dob_date = datetime.strptime(v, '%Y-%m-%d')
            current_date = datetime.now()
            if dob_date > current_date:
                raise ValueError('Date of birth cannot be in the future')
            if (current_date - dob_date).days > 365 * 100:  # More than 100 years old
                raise ValueError('Date of birth seems invalid')
        except ValueError as e:
            if 'time data' in str(e):
                raise ValueError('Date must be in YYYY-MM-DD format')
            raise e
        return v
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v and not re.match(r'^\+?[\d\s\-\(\)]{10,15}$', v):
            raise ValueError('Invalid phone number format')
        return v

class StudentCreate(BaseModel):
    reg_number: str
    name: str
    section: Section
    dob: str
    email: Optional[str] = None
    phone: Optional[str] = None
    year: Optional[str] = None
    branch: Optional[str] = None

class StudentLogin(BaseModel):
    reg_number: str
    dob: str

class StudentImport(BaseModel):
    students: List[StudentCreate]

# Faculty/Teacher Models
class Faculty(BaseDocument):
    faculty_id: str  # Unique faculty identifier
    name: str
    subjects: List[str]
    sections: List[Section]
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    is_active: bool = True
    
    @field_validator('faculty_id')
    @classmethod
    def validate_faculty_id(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Faculty ID cannot be empty')
        return v.strip().upper()

class FacultyCreate(BaseModel):
    faculty_id: str
    name: str
    subjects: List[str]
    sections: List[Section]
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None

class FacultyImport(BaseModel):
    faculty: List[FacultyCreate]

# Feedback Models
class QuestionRating(BaseModel):
    question_id: str
    question: str
    rating: int = Field(ge=1, le=5)  # Rating between 1-5

class IndividualFeedback(BaseModel):
    faculty_id: str
    faculty_name: str
    subject: str
    question_ratings: List[QuestionRating]
    overall_rating: float = Field(ge=1.0, le=5.0)
    detailed_feedback: Optional[str] = None
    suggestions: Optional[str] = None

class FeedbackSubmission(BaseDocument):
    student_section: Section
    semester: Optional[str] = None
    academic_year: Optional[str] = None
    faculty_feedbacks: List[IndividualFeedback]
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    is_anonymous: bool = True
    
    # Anonymous identifier for tracking without revealing identity
    anonymous_id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class FeedbackCreate(BaseModel):
    student_section: Section
    semester: Optional[str] = None
    academic_year: Optional[str] = None
    faculty_feedbacks: List[IndividualFeedback]

# Dashboard Analytics Models
class FacultyAnalytics(BaseModel):
    faculty_id: str
    faculty_name: str
    subject: str
    section: Section
    total_feedback_count: int
    average_rating: float
    question_wise_ratings: Dict[str, float]
    recent_feedback_count: int  # Last 30 days
    rating_distribution: Dict[str, int]  # Count per rating (1-5)

class SectionAnalytics(BaseModel):
    section: Section
    total_students: int
    total_feedback_submissions: int
    faculty_count: int
    average_section_rating: float
    top_rated_faculty: List[Dict[str, Any]]
    feedback_participation_rate: float

class DashboardSummary(BaseModel):
    total_students: int
    total_faculty: int
    total_feedback_submissions: int
    recent_submissions: int  # Last 7 days
    average_rating: float
    section_wise_summary: List[SectionAnalytics]
    top_rated_faculty: List[FacultyAnalytics]
    recent_feedback_trends: List[Dict[str, Any]]

# Response Models
class StudentResponse(BaseModel):
    id: str
    reg_number: str
    name: str
    section: Section
    email: Optional[str] = None
    year: Optional[str] = None
    branch: Optional[str] = None

class FacultyResponse(BaseModel):
    id: str
    faculty_id: str
    name: str
    subjects: List[str]
    sections: List[Section]
    email: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None

class LoginResponse(BaseModel):
    user: Dict[str, Any]
    message: str
    role: UserRole

# Utility Models
class ImportResult(BaseModel):
    success_count: int
    error_count: int
    errors: List[str]
    warnings: List[str]
    total_processed: int

class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
    error: Optional[str] = None