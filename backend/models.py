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

class GradeInterpretation(str, Enum):
    EXCELLENT = "Excellent"
    VERY_GOOD = "Very Good"
    GOOD = "Good"
    AVERAGE = "Average"
    NEEDS_IMPROVEMENT = "Needs Improvement"

# Base Models
class BaseDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    is_active: bool = True
    deleted_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now())

# Admin/Authentication Models
class Admin(BaseDocument):
    username: str = Field(..., min_length=3, max_length=50)
    password_hash: str  # Will store hashed password
    name: str = Field(..., min_length=2, max_length=100)
    role: UserRole
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None  # For HODs
    
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
    department: Optional[str] = None  # For HODs
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 12:
            raise ValueError('Password must be at least 12 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        # Check for common weak patterns
        if re.search(r'(.)\1{2,}', v):
            raise ValueError('Password cannot contain more than 2 consecutive identical characters')
        if re.search(r'(123|abc|qwe|asd|zxc)', v.lower()):
            raise ValueError('Password cannot contain common sequences')
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

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str
    
    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 12:
            raise ValueError('Password must be at least 12 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        # Check for common weak patterns
        if re.search(r'(.)\1{2,}', v):
            raise ValueError('Password cannot contain more than 2 consecutive identical characters')
        if re.search(r'(123|abc|qwe|asd|zxc)', v.lower()):
            raise ValueError('Password cannot contain common sequences')
        return v

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
    department: str = Field(..., min_length=2, max_length=50)  # Required field
    batch_year: str = Field(..., min_length=9, max_length=9)  # Format: "2024-2028"
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
    
    @field_validator('batch_year')
    @classmethod
    def validate_batch_year(cls, v):
        if not re.match(r'^\d{4}-\d{4}$', v):
            raise ValueError('Batch year must be in format YYYY-YYYY (e.g., 2024-2028)')
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
    department: str
    batch_year: str

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
    department: str = Field(..., min_length=2, max_length=50)  # Required field
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
    department: str
    designation: Optional[str] = None

class FacultyImport(BaseModel):
    faculty: List[FacultyCreate]

# Department and Batch Year Models
class Department(BaseDocument):
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=10)
    description: Optional[str] = None
    hod_id: Optional[str] = None  # Reference to Admin ID
    is_active: bool = True
    
    @field_validator('code')
    @classmethod
    def validate_code(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Department code cannot be empty')
        return v.strip().upper()

class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=10)
    description: Optional[str] = None

class BatchYear(BaseDocument):
    year_range: str = Field(..., min_length=9, max_length=9)  # Format: "2024-2028"
    department: str = Field(..., min_length=2, max_length=50)
    sections: List[Section] = Field(default_factory=list)
    is_active: bool = True
    
    @field_validator('year_range')
    @classmethod
    def validate_year_range(cls, v):
        if not re.match(r'^\d{4}-\d{4}$', v):
            raise ValueError('Year range must be in format YYYY-YYYY (e.g., 2024-2028)')
        return v

class BatchYearCreate(BaseModel):
    year_range: str = Field(..., min_length=9, max_length=9)
    department: str = Field(..., min_length=2, max_length=50)
    sections: List[Section] = Field(default_factory=list)

# Feedback Models
class QuestionRating(BaseModel):
    question_id: str
    question: str
    rating: int = Field(ge=1, le=10)  # Rating between 1-10
    weight: float = Field(ge=0, le=100)  # Weight percentage (0-100)

class IndividualFeedback(BaseModel):
    faculty_id: str
    faculty_name: str
    subject: str
    question_ratings: List[QuestionRating]
    overall_rating: float = Field(ge=1.0, le=10.0)
    weighted_score: float = Field(ge=0.0, le=100.0)  # Overall weighted percentage
    grade_interpretation: GradeInterpretation
    detailed_feedback: Optional[str] = None
    suggestions: Optional[str] = None

class FeedbackSubmission(BaseDocument):
    student_section: Section
    semester: str = Field(..., min_length=1, max_length=20)  # Required field
    academic_year: str = Field(..., min_length=4, max_length=10)  # Required field
    faculty_feedbacks: List[IndividualFeedback]
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    is_anonymous: bool = True
    student_id: Optional[str] = None  # For tracking (optional for anonymity)
    
    # Anonymous identifier for tracking without revealing identity
    anonymous_id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class FeedbackCreate(BaseModel):
    student_section: Section
    semester: str = Field(..., min_length=1, max_length=20)
    academic_year: str = Field(..., min_length=4, max_length=10)
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
    department: Optional[str] = None
    batch_year: Optional[str] = None

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

# Report Models
class GeneratedReport(BaseDocument):
    report_name: str
    department: str
    batch_year: str
    section: Section
    generated_by: str  # Admin ID
    report_type: str  # csv/pdf/excel
    file_path: Optional[str] = None
    file_data: Optional[bytes] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)  # faculty_count, feedback_count, etc.
    is_active: bool = True

class ReportGenerateRequest(BaseModel):
    department: str
    batch_year: str
    section: Section
    format: str = Field(..., pattern="^(csv|pdf|excel)$")

class ReportHistoryResponse(BaseModel):
    id: str
    report_name: str
    department: str
    batch_year: str
    section: Section
    generated_by: str
    generated_at: datetime
    report_type: str
    metadata: Dict[str, Any]

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

# Weighted Feedback Questions
FEEDBACK_QUESTIONS = [
    {
        "id": "punctuality",
        "question": "Punctuality",
        "weight": 10.0,
        "category": "Professionalism"
    },
    {
        "id": "voice_clarity",
        "question": "Voice Clarity and Audibility",
        "weight": 10.0,
        "category": "Communication"
    },
    {
        "id": "blackboard_usage",
        "question": "Usage of Blackboard and Legibility of Handwriting on the Board",
        "weight": 10.0,
        "category": "Teaching Method"
    },
    {
        "id": "student_interaction",
        "question": "Interaction with Students and Clarification of Doubts During the Class",
        "weight": 15.0,
        "category": "Student Engagement"
    },
    {
        "id": "class_inspiring",
        "question": "Making the Class Inspiring and Interesting",
        "weight": 15.0,
        "category": "Teaching Quality"
    },
    {
        "id": "discipline_maintenance",
        "question": "Maintenance of Discipline in the Classroom",
        "weight": 10.0,
        "category": "Classroom Management"
    },
    {
        "id": "availability_outside",
        "question": "Availability in the Campus Outside the Classroom",
        "weight": 5.0,
        "category": "Accessibility"
    },
    {
        "id": "syllabus_coverage",
        "question": "Rate of Syllabus Coverage",
        "weight": 10.0,
        "category": "Curriculum"
    },
    {
        "id": "paper_analysis",
        "question": "Analysis of Mid Papers & University Papers in the Class",
        "weight": 10.0,
        "category": "Assessment"
    },
    {
        "id": "question_bank",
        "question": "Giving Question Bank and Necessary Material",
        "weight": 5.0,
        "category": "Resources"
    }
]

def calculate_weighted_score(question_ratings: List[QuestionRating]) -> tuple[float, GradeInterpretation]:
    """Calculate weighted score and grade interpretation from question ratings"""
    if not question_ratings:
        return 0.0, GradeInterpretation.NEEDS_IMPROVEMENT
    
    total_weighted_score = 0.0
    total_weight = 0.0
    
    for rating in question_ratings:
        # Convert 1-10 scale to percentage and apply weight
        score_percentage = (rating.rating / 10.0) * 100
        weighted_score = score_percentage * (rating.weight / 100.0)
        total_weighted_score += weighted_score
        total_weight += rating.weight
    
    # Normalize by total weight if it doesn't equal 100%
    if total_weight > 0:
        final_score = (total_weighted_score / total_weight) * 100
    else:
        final_score = 0.0
    
    # Determine grade interpretation
    if final_score >= 90:
        grade = GradeInterpretation.EXCELLENT
    elif final_score >= 80:
        grade = GradeInterpretation.VERY_GOOD
    elif final_score >= 70:
        grade = GradeInterpretation.GOOD
    elif final_score >= 60:
        grade = GradeInterpretation.AVERAGE
    else:
        grade = GradeInterpretation.NEEDS_IMPROVEMENT
    
    return round(final_score, 2), grade