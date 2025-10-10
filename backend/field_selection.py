"""
Field selection utilities for API responses
"""
from typing import List, Dict, Any, Optional
from fastapi import Query

def get_field_selection(
    fields: Optional[str] = Query(None, description="Comma-separated list of fields to include")
) -> Optional[List[str]]:
    """Parse field selection from query parameter"""
    if not fields:
        return None
    
    return [field.strip() for field in fields.split(",") if field.strip()]

def apply_field_selection(data: Dict[str, Any], fields: Optional[List[str]]) -> Dict[str, Any]:
    """Apply field selection to data"""
    if not fields:
        return data
    
    return {field: data.get(field) for field in fields if field in data}

def apply_field_selection_to_list(data_list: List[Dict[str, Any]], fields: Optional[List[str]]) -> List[Dict[str, Any]]:
    """Apply field selection to a list of data"""
    if not fields:
        return data_list
    
    return [apply_field_selection(item, fields) for item in data_list]

class FieldSelector:
    """Helper class for field selection operations"""
    
    @staticmethod
    def get_allowed_fields(collection: str) -> List[str]:
        """Get allowed fields for a collection"""
        field_maps = {
            "students": [
                "id", "reg_number", "name", "section", "dob", "email", "phone",
                "department", "batch_year", "is_active", "created_at", "updated_at"
            ],
            "faculty": [
                "id", "name", "email", "phone", "department", "subjects", "sections",
                "is_active", "created_at", "updated_at"
            ],
            "admins": [
                "id", "username", "name", "role", "email", "phone", "department",
                "is_active", "created_at", "updated_at"
            ],
            "feedback_submissions": [
                "id", "student_section", "semester", "academic_year", "faculty_feedbacks",
                "submitted_at", "is_anonymous", "anonymous_id", "student_id", "created_at"
            ]
        }
        
        return field_maps.get(collection, [])
    
    @staticmethod
    def validate_fields(fields: List[str], collection: str) -> List[str]:
        """Validate and filter fields for a collection"""
        allowed_fields = FieldSelector.get_allowed_fields(collection)
        return [field for field in fields if field in allowed_fields]
    
    @staticmethod
    def get_default_fields(collection: str) -> List[str]:
        """Get default fields for a collection"""
        default_maps = {
            "students": ["id", "reg_number", "name", "section", "department", "batch_year"],
            "faculty": ["id", "name", "email", "department", "subjects"],
            "admins": ["id", "username", "name", "role", "department"],
            "feedback_submissions": ["id", "student_section", "semester", "academic_year", "submitted_at"]
        }
        
        return default_maps.get(collection, ["id", "name"])
