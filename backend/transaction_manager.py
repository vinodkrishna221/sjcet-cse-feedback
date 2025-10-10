"""
Transaction manager for MongoDB operations
"""
import logging
from typing import Dict, Any, List, Optional, Callable, Awaitable
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
from database import get_database

logger = logging.getLogger(__name__)

class TransactionManager:
    """Manages MongoDB transactions for multi-document operations"""
    
    def __init__(self):
        self.db = get_database()
        self.client = self.db.client
    
    @asynccontextmanager
    async def transaction(self):
        """Context manager for MongoDB transactions"""
        session = None
        try:
            # Start a session
            async with await self.client.start_session() as session:
                # Start a transaction
                async with session.start_transaction():
                    yield session
        except Exception as e:
            logger.error(f"Transaction failed: {e}")
            raise
        finally:
            if session:
                await session.end_session()
    
    async def execute_in_transaction(self, operations: List[Callable[[Any], Awaitable[Any]]]) -> List[Any]:
        """Execute multiple operations within a single transaction"""
        results = []
        async with self.transaction() as session:
            for operation in operations:
                try:
                    result = await operation(session)
                    results.append(result)
                except Exception as e:
                    logger.error(f"Operation failed in transaction: {e}")
                    raise
        
        return results

class DatabaseIntegrityManager:
    """Manages database integrity and relationships"""
    
    def __init__(self):
        self.db = get_database()
        self.transaction_manager = TransactionManager()
    
    async def create_student_with_validation(self, student_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create student with integrity validation"""
        async with self.transaction_manager.transaction() as session:
            # Validate department exists
            department = await self.db.departments.find_one(
                {"name": student_data["department"], "is_active": True},
                session=session
            )
            if not department:
                raise ValueError(f"Department {student_data['department']} does not exist")
            
            # Validate batch year exists
            batch_year = await self.db.batch_years.find_one(
                {"year": student_data["batch_year"], "is_active": True},
                session=session
            )
            if not batch_year:
                raise ValueError(f"Batch year {student_data['batch_year']} does not exist")
            
            # Create student
            result = await self.db.students.insert_one(student_data, session=session)
            student_data["id"] = str(result.inserted_id)
            
            return student_data
    
    async def create_faculty_with_validation(self, faculty_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create faculty with integrity validation"""
        async with self.transaction_manager.transaction() as session:
            # Validate department exists
            department = await self.db.departments.find_one(
                {"name": faculty_data["department"], "is_active": True},
                session=session
            )
            if not department:
                raise ValueError(f"Department {faculty_data['department']} does not exist")
            
            # Create faculty
            result = await self.db.faculty.insert_one(faculty_data, session=session)
            faculty_data["id"] = str(result.inserted_id)
            
            return faculty_data
    
    async def create_feedback_with_validation(self, feedback_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create feedback with integrity validation"""
        async with self.transaction_manager.transaction() as session:
            # Validate student exists
            student = await self.db.students.find_one(
                {"id": feedback_data["student_id"], "is_active": True},
                session=session
            )
            if not student:
                raise ValueError("Student not found")
            
            # Validate all faculty exist and teach the subjects
            for faculty_feedback in feedback_data["faculty_feedbacks"]:
                faculty = await self.db.faculty.find_one(
                    {"id": faculty_feedback["faculty_id"], "is_active": True},
                    session=session
                )
                if not faculty:
                    raise ValueError(f"Faculty {faculty_feedback['faculty_id']} not found")
                
                if faculty_feedback["subject"] not in faculty.get("subjects", []):
                    raise ValueError(f"Faculty does not teach {faculty_feedback['subject']}")
            
            # Create feedback
            result = await self.db.feedback_submissions.insert_one(feedback_data, session=session)
            feedback_data["id"] = str(result.inserted_id)
            
            return feedback_data
    
    async def cascade_delete_student(self, student_id: str) -> bool:
        """Cascade delete student and related data"""
        async with self.transaction_manager.transaction() as session:
            # Soft delete student
            await self.db.students.update_one(
                {"id": student_id},
                {
                    "$set": {
                        "is_active": False,
                        "deleted_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                },
                session=session
            )
            
            # Soft delete related feedback submissions
            await self.db.feedback_submissions.update_many(
                {"student_id": student_id},
                {
                    "$set": {
                        "is_active": False,
                        "deleted_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                },
                session=session
            )
            
            return True
    
    async def cascade_delete_faculty(self, faculty_id: str) -> bool:
        """Cascade delete faculty and related data"""
        async with self.transaction_manager.transaction() as session:
            # Soft delete faculty
            await self.db.faculty.update_one(
                {"id": faculty_id},
                {
                    "$set": {
                        "is_active": False,
                        "deleted_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                },
                session=session
            )
            
            # Update feedback submissions to remove this faculty
            await self.db.feedback_submissions.update_many(
                {"faculty_feedbacks.faculty_id": faculty_id},
                {
                    "$pull": {"faculty_feedbacks": {"faculty_id": faculty_id}},
                    "$set": {"updated_at": datetime.utcnow()}
                },
                session=session
            )
            
            return True

# Global instances
transaction_manager = TransactionManager()
integrity_manager = DatabaseIntegrityManager()
