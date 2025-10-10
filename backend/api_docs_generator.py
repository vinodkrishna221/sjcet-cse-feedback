"""
API documentation generator with examples and error codes
"""
import json
from typing import Dict, Any, List
from pathlib import Path

class APIDocsGenerator:
    """Generate comprehensive API documentation"""
    
    def __init__(self):
        self.docs = {
            "openapi": "3.0.2",
            "info": {
                "title": "Student Feedback Management System API",
                "version": "1.0.0",
                "description": "Comprehensive API for student feedback management"
            },
            "servers": [
                {"url": "http://localhost:8000", "description": "Development"},
                {"url": "https://api.college.edu", "description": "Production"}
            ],
            "paths": {},
            "components": {
                "schemas": {},
                "responses": {},
                "parameters": {},
                "examples": {},
                "securitySchemes": {
                    "BearerAuth": {
                        "type": "http",
                        "scheme": "bearer",
                        "bearerFormat": "JWT"
                    }
                }
            },
            "tags": []
        }
    
    def generate_error_codes_docs(self) -> Dict[str, Any]:
        """Generate error codes documentation"""
        return {
            "title": "Error Codes Reference",
            "description": "Complete list of error codes and their meanings",
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "error_codes": {
                                "type": "object",
                                "description": "Error codes organized by category"
                            }
                        }
                    },
                    "examples": {
                        "authentication_errors": {
                            "summary": "Authentication Errors",
                            "value": {
                                "AUTH_001": "Invalid username or password",
                                "AUTH_002": "Authentication token has expired",
                                "AUTH_003": "Invalid authentication token",
                                "AUTH_004": "Insufficient permissions for this operation",
                                "AUTH_005": "Account is locked due to multiple failed login attempts",
                                "AUTH_006": "Account is inactive"
                            }
                        },
                        "validation_errors": {
                            "summary": "Validation Errors",
                            "value": {
                                "VAL_001": "Field '{field}' is required",
                                "VAL_002": "Field '{field}' has invalid format",
                                "VAL_003": "Field '{field}' is too long (max {max_length} characters)",
                                "VAL_004": "Field '{field}' is too short (min {min_length} characters)",
                                "VAL_005": "Field '{field}' value is out of range",
                                "VAL_006": "Field '{field}' value already exists",
                                "VAL_007": "Invalid email format",
                                "VAL_008": "Invalid phone number format",
                                "VAL_009": "Invalid date format"
                            }
                        },
                        "business_errors": {
                            "summary": "Business Logic Errors",
                            "value": {
                                "BIZ_001": "Student not found",
                                "BIZ_002": "Faculty member not found",
                                "BIZ_003": "Feedback already submitted for this semester",
                                "BIZ_004": "Faculty does not teach this subject",
                                "BIZ_005": "Faculty does not teach this section",
                                "BIZ_006": "Department not found",
                                "BIZ_007": "Batch year not found",
                                "BIZ_008": "Feedback submission period is closed"
                            }
                        }
                    }
                }
            }
        }
    
    def generate_examples(self) -> Dict[str, Any]:
        """Generate API examples"""
        return {
            "student_login": {
                "summary": "Student Login",
                "description": "Login using registration number and date of birth",
                "value": {
                    "reg_number": "2024001",
                    "dob": "2000-01-15"
                }
            },
            "admin_login": {
                "summary": "Admin Login",
                "description": "Login using username and password",
                "value": {
                    "username": "hod_cse",
                    "password": "SecurePassword123!"
                }
            },
            "feedback_submission": {
                "summary": "Feedback Submission",
                "description": "Submit feedback for multiple faculty members",
                "value": {
                    "student_section": "A",
                    "semester": "S1",
                    "academic_year": "2024-25",
                    "faculty_feedbacks": [
                        {
                            "faculty_id": "faculty_001",
                            "faculty_name": "Dr. John Smith",
                            "subject": "Data Structures",
                            "question_ratings": [
                                {
                                    "question_id": "punctuality",
                                    "question": "Punctuality",
                                    "rating": 8,
                                    "weight": 10.0
                                },
                                {
                                    "question_id": "teaching_quality",
                                    "question": "Teaching Quality",
                                    "rating": 9,
                                    "weight": 15.0
                                }
                            ],
                            "overall_rating": 8.5,
                            "weighted_score": 85.0,
                            "grade_interpretation": "Good",
                            "detailed_feedback": "Excellent teaching methods",
                            "suggestions": "More practical examples would be helpful"
                        }
                    ],
                    "is_anonymous": True
                }
            },
            "student_creation": {
                "summary": "Student Creation",
                "description": "Create a new student record",
                "value": {
                    "reg_number": "2024001",
                    "name": "John Doe",
                    "section": "A",
                    "dob": "2000-01-15",
                    "email": "john.doe@college.edu",
                    "phone": "+91-9876543210",
                    "department": "CSE",
                    "batch_year": "2024"
                }
            },
            "faculty_creation": {
                "summary": "Faculty Creation",
                "description": "Create a new faculty record",
                "value": {
                    "name": "Dr. Jane Smith",
                    "email": "jane.smith@college.edu",
                    "phone": "+91-9876543211",
                    "department": "CSE",
                    "subjects": ["Data Structures", "Algorithms"],
                    "sections": ["A", "B"]
                }
            },
            "paginated_response": {
                "summary": "Paginated Response",
                "description": "Response format for paginated endpoints",
                "value": {
                    "success": True,
                    "message": "Retrieved 20 students",
                    "data": {
                        "data": [
                            {
                                "id": "student_001",
                                "reg_number": "2024001",
                                "name": "John Doe",
                                "section": "A",
                                "department": "CSE",
                                "batch_year": "2024"
                            }
                        ],
                        "pagination": {
                            "page": 1,
                            "limit": 20,
                            "total": 100,
                            "total_pages": 5,
                            "has_next": True,
                            "has_prev": False
                        },
                        "total": 100,
                        "page": 1,
                        "limit": 20,
                        "total_pages": 5,
                        "has_next": True,
                        "has_prev": False
                    }
                }
            },
            "error_response": {
                "summary": "Error Response",
                "description": "Standard error response format",
                "value": {
                    "success": False,
                    "error_code": "AUTH_001",
                    "message": "Invalid username or password",
                    "details": {
                        "field": "password",
                        "attempts_remaining": 4
                    }
                }
            }
        }
    
    def generate_usage_guidelines(self) -> Dict[str, Any]:
        """Generate API usage guidelines"""
        return {
            "title": "API Usage Guidelines",
            "content": {
                "authentication": {
                    "title": "Authentication",
                    "description": "All API endpoints require authentication except for login endpoints",
                    "steps": [
                        "1. Call the appropriate login endpoint to get a JWT token",
                        "2. Include the token in the Authorization header: `Bearer <token>`",
                        "3. Tokens expire after 2 hours, use the refresh endpoint to get new tokens"
                    ]
                },
                "pagination": {
                    "title": "Pagination",
                    "description": "List endpoints support pagination with query parameters",
                    "parameters": {
                        "page": "Page number (1-based, default: 1)",
                        "limit": "Items per page (1-100, default: 20)",
                        "sort_by": "Field to sort by (optional)",
                        "sort_order": "Sort order: 'asc' or 'desc' (default: 'asc')"
                    },
                    "example": "GET /api/v1/students?page=1&limit=10&sort_by=name&sort_order=asc"
                },
                "field_selection": {
                    "title": "Field Selection",
                    "description": "Control which fields are returned in responses",
                    "parameter": "fields",
                    "example": "GET /api/v1/students?fields=id,name,reg_number",
                    "note": "Only allowed fields for each collection can be selected"
                },
                "bulk_operations": {
                    "title": "Bulk Operations",
                    "description": "Perform multiple operations in a single request",
                    "endpoints": [
                        "POST /api/v1/students/bulk-create",
                        "PUT /api/v1/students/bulk-update",
                        "DELETE /api/v1/students/bulk-delete"
                    ],
                    "note": "Bulk operations return detailed results showing success/failure for each item"
                },
                "rate_limiting": {
                    "title": "Rate Limiting",
                    "description": "API requests are rate-limited based on user role",
                    "limits": {
                        "anonymous": "30 requests/minute",
                        "students": "100 requests/minute",
                        "hod": "150 requests/minute",
                        "principal": "200 requests/minute"
                    },
                    "headers": {
                        "X-RateLimit-Limit": "Request limit per window",
                        "X-RateLimit-Remaining": "Remaining requests in current window",
                        "X-RateLimit-Reset": "Time when the rate limit resets"
                    }
                },
                "error_handling": {
                    "title": "Error Handling",
                    "description": "All errors follow a consistent format",
                    "format": {
                        "success": "Always false for errors",
                        "error_code": "Standardized error code",
                        "message": "Human-readable error message",
                        "details": "Additional error information"
                    }
                }
            }
        }
    
    def generate_schema_examples(self) -> Dict[str, Any]:
        """Generate schema examples for common models"""
        return {
            "Student": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "example": "student_001"},
                    "reg_number": {"type": "string", "example": "2024001"},
                    "name": {"type": "string", "example": "John Doe"},
                    "section": {"type": "string", "enum": ["A", "B"], "example": "A"},
                    "dob": {"type": "string", "format": "date", "example": "2000-01-15"},
                    "email": {"type": "string", "format": "email", "example": "john.doe@college.edu"},
                    "phone": {"type": "string", "example": "+91-9876543210"},
                    "department": {"type": "string", "example": "CSE"},
                    "batch_year": {"type": "string", "example": "2024"},
                    "is_active": {"type": "boolean", "example": True},
                    "created_at": {"type": "string", "format": "date-time"},
                    "updated_at": {"type": "string", "format": "date-time"}
                },
                "required": ["reg_number", "name", "section", "dob", "department", "batch_year"]
            },
            "Faculty": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "example": "faculty_001"},
                    "name": {"type": "string", "example": "Dr. Jane Smith"},
                    "email": {"type": "string", "format": "email", "example": "jane.smith@college.edu"},
                    "phone": {"type": "string", "example": "+91-9876543211"},
                    "department": {"type": "string", "example": "CSE"},
                    "subjects": {"type": "array", "items": {"type": "string"}, "example": ["Data Structures", "Algorithms"]},
                    "sections": {"type": "array", "items": {"type": "string"}, "example": ["A", "B"]},
                    "is_active": {"type": "boolean", "example": True},
                    "created_at": {"type": "string", "format": "date-time"},
                    "updated_at": {"type": "string", "format": "date-time"}
                },
                "required": ["name", "email", "department", "subjects", "sections"]
            },
            "FeedbackSubmission": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "example": "feedback_001"},
                    "student_section": {"type": "string", "enum": ["A", "B"], "example": "A"},
                    "semester": {"type": "string", "example": "S1"},
                    "academic_year": {"type": "string", "example": "2024-25"},
                    "faculty_feedbacks": {"type": "array", "items": {"$ref": "#/components/schemas/IndividualFeedback"}},
                    "submitted_at": {"type": "string", "format": "date-time"},
                    "is_anonymous": {"type": "boolean", "example": True},
                    "anonymous_id": {"type": "string", "example": "anon_001"},
                    "student_id": {"type": "string", "example": "student_001"}
                },
                "required": ["student_section", "semester", "academic_year", "faculty_feedbacks"]
            }
        }
    
    def save_docs(self, output_path: str = "api_docs.json"):
        """Save generated documentation to file"""
        docs_path = Path(output_path)
        with open(docs_path, 'w', encoding='utf-8') as f:
            json.dump(self.docs, f, indent=2, ensure_ascii=False)
        print(f"API documentation saved to {docs_path}")

def generate_complete_docs():
    """Generate complete API documentation"""
    generator = APIDocsGenerator()
    
    # Add error codes documentation
    generator.docs["components"]["examples"]["error_codes"] = generator.generate_error_codes_docs()
    
    # Add usage examples
    generator.docs["components"]["examples"].update(generator.generate_examples())
    
    # Add schema examples
    generator.docs["components"]["schemas"].update(generator.generate_schema_examples())
    
    # Add usage guidelines
    generator.docs["info"]["x-usage-guidelines"] = generator.generate_usage_guidelines()
    
    # Save documentation
    generator.save_docs("api_docs.json")
    
    return generator.docs

if __name__ == "__main__":
    generate_complete_docs()
