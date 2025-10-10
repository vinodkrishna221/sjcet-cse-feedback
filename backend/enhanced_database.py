"""
Enhanced database operations with soft delete, transactions, and validation
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from database import DatabaseOperations as BaseDatabaseOperations
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError

logger = logging.getLogger(__name__)

class EnhancedDatabaseOperations(BaseDatabaseOperations):
    """Enhanced database operations with soft delete and validation"""
    
    @staticmethod
    async def soft_delete(collection: str, document_id: str) -> bool:
        """Soft delete a document by setting is_active=False and deleted_at timestamp"""
        try:
            result = await BaseDatabaseOperations.update_one(
                collection,
                {"id": document_id},
                {
                    "is_active": False,
                    "deleted_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Soft delete failed for {collection}:{document_id}: {e}")
            return False
    
    @staticmethod
    async def restore(collection: str, document_id: str) -> bool:
        """Restore a soft-deleted document"""
        try:
            result = await BaseDatabaseOperations.update_one(
                collection,
                {"id": document_id, "is_active": False},
                {
                    "is_active": True,
                    "deleted_at": None,
                    "updated_at": datetime.utcnow()
                }
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Restore failed for {collection}:{document_id}: {e}")
            return False
    
    @staticmethod
    async def find_active(collection: str, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Find an active (non-deleted) document"""
        query["is_active"] = True
        return await BaseDatabaseOperations.find_one(collection, query)
    
    @staticmethod
    async def find_all_active(collection: str, query: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Find all active (non-deleted) documents"""
        if query is None:
            query = {}
        query["is_active"] = True
        return await BaseDatabaseOperations.find_all(collection, query)
    
    @staticmethod
    async def validate_student_exists(student_id: str) -> bool:
        """Validate that a student exists and is active"""
        student = await EnhancedDatabaseOperations.find_active("students", {"id": student_id})
        return student is not None
    
    @staticmethod
    async def validate_faculty_exists(faculty_id: str) -> bool:
        """Validate that a faculty member exists and is active"""
        faculty = await EnhancedDatabaseOperations.find_active("faculty", {"id": faculty_id})
        return faculty is not None
    
    @staticmethod
    async def validate_faculty_teaches_subject(faculty_id: str, subject: str) -> bool:
        """Validate that a faculty member teaches a specific subject"""
        faculty = await EnhancedDatabaseOperations.find_active("faculty", {"id": faculty_id})
        if not faculty:
            return False
        return subject in faculty.get("subjects", [])
    
    @staticmethod
    async def validate_faculty_teaches_section(faculty_id: str, section: str) -> bool:
        """Validate that a faculty member teaches a specific section"""
        faculty = await EnhancedDatabaseOperations.find_active("faculty", {"id": faculty_id})
        if not faculty:
            return False
        return section in faculty.get("sections", [])
    
    @staticmethod
    async def archive_old_data(collection: str, cutoff_date: datetime) -> int:
        """Archive old data by moving to archive collection"""
        try:
            # Find documents older than cutoff date
            old_docs = await BaseDatabaseOperations.find_all(
                collection,
                {"created_at": {"$lt": cutoff_date}, "is_active": True}
            )
            
            if not old_docs:
                return 0
            
            # Move to archive collection
            archive_collection = f"{collection}_archive"
            for doc in old_docs:
                doc["archived_at"] = datetime.utcnow()
                await BaseDatabaseOperations.insert_one(archive_collection, doc)
            
            # Soft delete the original documents
            result = await BaseDatabaseOperations.update_many(
                collection,
                {"created_at": {"$lt": cutoff_date}, "is_active": True},
                {
                    "is_active": False,
                    "archived_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            )
            
            logger.info(f"Archived {result.modified_count} documents from {collection}")
            return result.modified_count
            
        except Exception as e:
            logger.error(f"Archive operation failed for {collection}: {e}")
            return 0
    
    @staticmethod
    async def get_validation_errors(collection: str, document: Dict[str, Any]) -> List[str]:
        """Get validation errors for a document"""
        errors = []
        
        if collection == "students":
            # Validate student-specific fields
            if "reg_number" in document:
                existing = await BaseDatabaseOperations.find_one(
                    "students",
                    {"reg_number": document["reg_number"], "is_active": True}
                )
                if existing and existing.get("id") != document.get("id"):
                    errors.append("Registration number already exists")
        
        elif collection == "faculty":
            # Validate faculty-specific fields
            if "email" in document and document["email"]:
                existing = await BaseDatabaseOperations.find_one(
                    "faculty",
                    {"email": document["email"], "is_active": True}
                )
                if existing and existing.get("id") != document.get("id"):
                    errors.append("Email already exists")
        
        elif collection == "admins":
            # Validate admin-specific fields
            if "username" in document:
                existing = await BaseDatabaseOperations.find_one(
                    "admins",
                    {"username": document["username"], "is_active": True}
                )
                if existing and existing.get("id") != document.get("id"):
                    errors.append("Username already exists")
            
            if "email" in document and document["email"]:
                existing = await BaseDatabaseOperations.find_one(
                    "admins",
                    {"email": document["email"], "is_active": True}
                )
                if existing and existing.get("id") != document.get("id"):
                    errors.append("Email already exists")
        
        return errors
