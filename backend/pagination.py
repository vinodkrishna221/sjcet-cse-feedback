"""
Pagination utilities for API responses
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import Query

class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(1, ge=1, description="Page number (1-based)")
    limit: int = Field(20, ge=1, le=100, description="Number of items per page")
    sort_by: Optional[str] = Field(None, description="Field to sort by")
    sort_order: str = Field("asc", regex="^(asc|desc)$", description="Sort order")
    cursor: Optional[str] = Field(None, description="Cursor for cursor-based pagination")

class PaginatedResponse(BaseModel):
    """Paginated response model"""
    data: List[Any]
    pagination: Dict[str, Any]
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_prev: bool
    next_cursor: Optional[str] = None
    prev_cursor: Optional[str] = None

class PaginationHelper:
    """Helper class for pagination operations"""
    
    @staticmethod
    def get_skip(page: int, limit: int) -> int:
        """Calculate skip value for MongoDB"""
        return (page - 1) * limit
    
    @staticmethod
    def get_sort_direction(sort_order: str) -> int:
        """Get MongoDB sort direction"""
        return 1 if sort_order == "asc" else -1
    
    @staticmethod
    def create_sort_dict(sort_by: Optional[str], sort_order: str) -> Dict[str, int]:
        """Create MongoDB sort dictionary"""
        if not sort_by:
            return {"created_at": -1}  # Default sort by creation date
        
        return {sort_by: PaginationHelper.get_sort_direction(sort_order)}
    
    @staticmethod
    def create_paginated_response(
        data: List[Any],
        total: int,
        page: int,
        limit: int,
        next_cursor: Optional[str] = None,
        prev_cursor: Optional[str] = None
    ) -> PaginatedResponse:
        """Create paginated response"""
        total_pages = (total + limit - 1) // limit
        
        return PaginatedResponse(
            data=data,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            },
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
            next_cursor=next_cursor,
            prev_cursor=prev_cursor
        )

def get_pagination_params(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: Optional[str] = Query(None, description="Sort field"),
    sort_order: str = Query("asc", regex="^(asc|desc)$", description="Sort order")
) -> PaginationParams:
    """Dependency for pagination parameters"""
    return PaginationParams(
        page=page,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order
    )

class CursorPagination:
    """Cursor-based pagination for better performance with large datasets"""
    
    @staticmethod
    def create_cursor(data: Any, sort_field: str = "created_at") -> str:
        """Create cursor from data"""
        import base64
        import json
        
        cursor_data = {
            "value": data.get(sort_field),
            "id": data.get("id")
        }
        return base64.b64encode(json.dumps(cursor_data).encode()).decode()
    
    @staticmethod
    def parse_cursor(cursor: str) -> Dict[str, Any]:
        """Parse cursor to get values"""
        import base64
        import json
        
        try:
            decoded = base64.b64decode(cursor.encode()).decode()
            return json.loads(decoded)
        except Exception:
            return {}
    
    @staticmethod
    def create_cursor_query(cursor: Optional[str], sort_field: str = "created_at", sort_order: str = "desc") -> Dict[str, Any]:
        """Create MongoDB query for cursor-based pagination"""
        if not cursor:
            return {}
        
        cursor_data = CursorPagination.parse_cursor(cursor)
        if not cursor_data:
            return {}
        
        value = cursor_data.get("value")
        if not value:
            return {}
        
        if sort_order == "desc":
            return {sort_field: {"$lt": value}}
        else:
            return {sort_field: {"$gt": value}}
