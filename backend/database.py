from motor.motor_asyncio import AsyncIOMotorClient
import os
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class Database:
    client: Optional[AsyncIOMotorClient] = None
    database = None

# Database connection
def get_database():
    return Database.database

async def connect_to_mongo():
    """Create database connection"""
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    Database.client = AsyncIOMotorClient(mongo_url)
    Database.database = Database.client[db_name]
    
    # Create indexes for better performance
    await create_indexes()
    logger.info(f"Connected to MongoDB: {db_name}")

async def close_mongo_connection():
    """Close database connection"""
    if Database.client:
        Database.client.close()
        logger.info("Disconnected from MongoDB")

async def create_indexes():
    """Create database indexes for optimal performance"""
    db = get_database()
    
    try:
        # Student indexes
        await db.students.create_index("reg_number", unique=True)
        await db.students.create_index([("section", 1), ("is_active", 1)])
        
        # Faculty indexes
        await db.faculty.create_index("faculty_id", unique=True)
        await db.faculty.create_index([("sections", 1), ("is_active", 1)])
        await db.faculty.create_index("subjects")
        
        # Feedback indexes
        await db.feedback_submissions.create_index([("submitted_at", -1)])
        await db.feedback_submissions.create_index("student_section")
        await db.feedback_submissions.create_index("faculty_feedbacks.faculty_id")
        await db.feedback_submissions.create_index("anonymous_id")
        
        # Admin indexes
        await db.admins.create_index("username", unique=True)
        await db.admins.create_index("role")
        
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")

# Database utility functions
class DatabaseOperations:
    
    @staticmethod
    async def find_one(collection: str, filter_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Find one document in collection"""
        db = get_database()
        return await db[collection].find_one(filter_dict)
    
    @staticmethod
    async def find_many(collection: str, filter_dict: Dict[str, Any] = None, 
                       limit: int = None, sort: List[tuple] = None) -> List[Dict[str, Any]]:
        """Find multiple documents in collection"""
        db = get_database()
        cursor = db[collection].find(filter_dict or {})
        
        if sort:
            cursor = cursor.sort(sort)
        if limit:
            cursor = cursor.limit(limit)
            
        return await cursor.to_list(length=limit)
    
    @staticmethod
    async def insert_one(collection: str, document: Dict[str, Any]) -> str:
        """Insert one document and return id"""
        db = get_database()
        document['created_at'] = datetime.utcnow()
        document['updated_at'] = datetime.utcnow()
        result = await db[collection].insert_one(document)
        return str(result.inserted_id)
    
    @staticmethod
    async def insert_many(collection: str, documents: List[Dict[str, Any]]) -> List[str]:
        """Insert multiple documents and return ids"""
        db = get_database()
        now = datetime.utcnow()
        for doc in documents:
            doc['created_at'] = now
            doc['updated_at'] = now
        result = await db[collection].insert_many(documents)
        return [str(id) for id in result.inserted_ids]
    
    @staticmethod
    async def update_one(collection: str, filter_dict: Dict[str, Any], 
                        update_dict: Dict[str, Any]) -> bool:
        """Update one document"""
        db = get_database()
        update_dict['updated_at'] = datetime.utcnow()
        result = await db[collection].update_one(filter_dict, {"$set": update_dict})
        return result.modified_count > 0
    
    @staticmethod
    async def delete_one(collection: str, filter_dict: Dict[str, Any]) -> bool:
        """Delete one document"""
        db = get_database()
        result = await db[collection].delete_one(filter_dict)
        return result.deleted_count > 0
    
    @staticmethod
    async def count_documents(collection: str, filter_dict: Dict[str, Any] = None) -> int:
        """Count documents in collection"""
        db = get_database()
        return await db[collection].count_documents(filter_dict or {})
    
    @staticmethod
    async def aggregate(collection: str, pipeline: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Perform aggregation query"""
        db = get_database()
        cursor = db[collection].aggregate(pipeline)
        return await cursor.to_list(length=None)

# Analytics helper functions
class AnalyticsOperations:
    
    @staticmethod
    async def get_faculty_analytics(faculty_id: str = None, section: str = None) -> List[Dict[str, Any]]:
        """Get faculty-wise feedback analytics"""
        db = get_database()
        
        match_conditions = {}
        if faculty_id:
            match_conditions['faculty_feedbacks.faculty_id'] = faculty_id
        if section:
            match_conditions['student_section'] = section
            
        pipeline = [
            {"$match": match_conditions},
            {"$unwind": "$faculty_feedbacks"},
            {"$group": {
                "_id": {
                    "faculty_id": "$faculty_feedbacks.faculty_id",
                    "faculty_name": "$faculty_feedbacks.faculty_name",
                    "subject": "$faculty_feedbacks.subject",
                    "section": "$student_section"
                },
                "total_feedback": {"$sum": 1},
                "average_rating": {"$avg": "$faculty_feedbacks.overall_rating"},
                "ratings": {"$push": "$faculty_feedbacks.overall_rating"},
                "question_ratings": {"$push": "$faculty_feedbacks.question_ratings"}
            }},
            {"$sort": {"average_rating": -1}}
        ]
        
        return await DatabaseOperations.aggregate("feedback_submissions", pipeline)
    
    @staticmethod
    async def get_section_analytics() -> List[Dict[str, Any]]:
        """Get section-wise analytics"""
        db = get_database()
        
        pipeline = [
            {"$group": {
                "_id": "$student_section",
                "total_submissions": {"$sum": 1},
                "average_rating": {"$avg": {
                    "$avg": "$faculty_feedbacks.overall_rating"
                }},
                "recent_submissions": {
                    "$sum": {
                        "$cond": [
                            {"$gte": ["$submitted_at", datetime.utcnow() - timedelta(days=30)]},
                            1, 0
                        ]
                    }
                }
            }}
        ]
        
        return await DatabaseOperations.aggregate("feedback_submissions", pipeline)
    
    @staticmethod
    async def get_dashboard_summary() -> Dict[str, Any]:
        """Get complete dashboard summary"""
        db = get_database()
        
        # Get counts
        total_students = await DatabaseOperations.count_documents("students", {"is_active": True})
        total_faculty = await DatabaseOperations.count_documents("faculty", {"is_active": True})
        total_feedback = await DatabaseOperations.count_documents("feedback_submissions")
        
        # Get recent feedback (last 7 days)
        recent_date = datetime.utcnow() - timedelta(days=7)
        recent_feedback = await DatabaseOperations.count_documents(
            "feedback_submissions", 
            {"submitted_at": {"$gte": recent_date}}
        )
        
        # Get average rating
        avg_pipeline = [
            {"$unwind": "$faculty_feedbacks"},
            {"$group": {
                "_id": None,
                "average_rating": {"$avg": "$faculty_feedbacks.overall_rating"}
            }}
        ]
        avg_result = await DatabaseOperations.aggregate("feedback_submissions", avg_pipeline)
        average_rating = avg_result[0]['average_rating'] if avg_result else 0
        
        return {
            "total_students": total_students,
            "total_faculty": total_faculty,
            "total_feedback_submissions": total_feedback,
            "recent_submissions": recent_feedback,
            "average_rating": round(average_rating, 2)
        }