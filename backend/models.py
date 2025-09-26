from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

# Enums
class UserRole(str, Enum):
    STUDENT = "student"
    HOD = "hod"
    PRINCIPAL = "principal"

class Section(str, Enum):
    A = "A"
    B = "B"

# Base Models
class BaseDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Admin/Authentication Models
class Admin(BaseDocument):
    username: str
    password_hash: str  # Will store hashed password
    name: str
    role: UserRole
    email: Optional[str] = None
    phone: Optional[str] = None

class AdminCreate(BaseModel):
    username: str
    password: str
    name: str
    role: UserRole
    email: Optional[str] = None
    phone: Optional[str] = None

class AdminLogin(BaseModel):
    username: str
    password: str

# Student Models
class Student(BaseDocument):
    reg_number: str
    name: str
    section: Section
    dob: str  # Format: YYYY-MM-DD
    email: Optional[str] = None
    phone: Optional[str] = None
    year: Optional[str] = None
    branch: Optional[str] = None
    is_active: bool = True
    
    @validator('reg_number')
    def validate_reg_number(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Registration number cannot be empty')
        return v.strip().upper()

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
    
    @validator('faculty_id')
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