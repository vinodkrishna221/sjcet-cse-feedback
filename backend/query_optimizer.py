"""
Query optimization service for MongoDB operations
"""
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorCollection
from pymongo import ASCENDING, DESCENDING, TEXT
from bson import ObjectId

logger = logging.getLogger(__name__)


class QueryOptimizer:
    """MongoDB query optimization service"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self._index_cache = {}
    
    async def ensure_indexes(self):
        """Ensure all necessary indexes are created"""
        try:
            # Students collection indexes
            await self.db.students.create_index([("section", ASCENDING), ("batch_year", ASCENDING)])
            await self.db.students.create_index([("department", ASCENDING), ("is_active", ASCENDING)])
            await self.db.students.create_index([("name", TEXT), ("reg_number", TEXT)])
            await self.db.students.create_index([("is_active", ASCENDING)])
            await self.db.students.create_index([("created_at", DESCENDING)])
            
            # Faculty collection indexes
            await self.db.faculty.create_index([("department", ASCENDING), ("is_active", ASCENDING)])
            await self.db.faculty.create_index([("subjects", ASCENDING)])
            await self.db.faculty.create_index([("name", TEXT)])
            await self.db.faculty.create_index([("is_active", ASCENDING)])
            await self.db.faculty.create_index([("created_at", DESCENDING)])
            
            # Feedback submissions indexes
            await self.db.feedback_submissions.create_index([("student_section", ASCENDING), ("semester", ASCENDING)])
            await self.db.feedback_submissions.create_index([("semester", ASCENDING), ("academic_year", ASCENDING)])
            await self.db.feedback_submissions.create_index([("submitted_at", DESCENDING)])
            await self.db.feedback_submissions.create_index([("anonymous_id", ASCENDING)], unique=True)
            await self.db.feedback_submissions.create_index([("student_id", ASCENDING), ("semester", ASCENDING), ("academic_year", ASCENDING)], unique=True)
            
            # Faculty feedbacks compound index
            await self.db.feedback_submissions.create_index([("faculty_feedbacks.faculty_id", ASCENDING)])
            
            # Admins collection indexes
            await self.db.admins.create_index([("role", ASCENDING), ("is_active", ASCENDING)])
            await self.db.admins.create_index([("department", ASCENDING)])
            await self.db.admins.create_index([("is_active", ASCENDING)])
            
            logger.info("All indexes created successfully")
        except Exception as e:
            logger.error(f"Error creating indexes: {e}")
            raise
    
    async def get_collection_stats(self, collection_name: str) -> Dict[str, Any]:
        """Get collection statistics"""
        try:
            collection = self.db[collection_name]
            stats = await collection.aggregate([
                {"$group": {
                    "_id": None,
                    "count": {"$sum": 1},
                    "avg_size": {"$avg": {"$bsonSize": "$$ROOT"}}
                }}
            ]).to_list(1)
            
            if stats:
                return {
                    "total_documents": stats[0]["count"],
                    "average_document_size": round(stats[0]["avg_size"], 2)
                }
            return {"total_documents": 0, "average_document_size": 0}
        except Exception as e:
            logger.error(f"Error getting collection stats for {collection_name}: {e}")
            return {"total_documents": 0, "average_document_size": 0}
    
    async def analyze_query_performance(self, collection_name: str, query: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze query performance using explain"""
        try:
            collection = self.db[collection_name]
            explain_result = await collection.find(query).explain()
            
            execution_stats = explain_result.get("executionStats", {})
            return {
                "execution_time_ms": execution_stats.get("executionTimeMillis", 0),
                "total_docs_examined": execution_stats.get("totalDocsExamined", 0),
                "total_docs_returned": execution_stats.get("totalDocsReturned", 0),
                "indexes_used": [stage.get("indexName") for stage in execution_stats.get("executionStages", {}).get("inputStage", {}).get("inputStages", [])],
                "winning_plan": explain_result.get("queryPlanner", {}).get("winningPlan", {})
            }
        except Exception as e:
            logger.error(f"Error analyzing query performance: {e}")
            return {}


class OptimizedQueries:
    """Collection of optimized query methods"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.optimizer = QueryOptimizer(db)
    
    async def get_students_paginated(
        self,
        page: int = 1,
        limit: int = 20,
        section: Optional[str] = None,
        department: Optional[str] = None,
        batch_year: Optional[int] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """Get paginated students with optimized queries"""
        try:
            # Build filter
            filter_dict = {"is_active": True}
            if section:
                filter_dict["section"] = section
            if department:
                filter_dict["department"] = department
            if batch_year:
                filter_dict["batch_year"] = batch_year
            if search:
                filter_dict["$text"] = {"$search": search}
            
            # Build sort
            sort_direction = DESCENDING if sort_order == "desc" else ASCENDING
            sort_dict = [(sort_by, sort_direction)]
            
            # Calculate skip
            skip = (page - 1) * limit
            
            # Execute queries in parallel
            students_task = self.db.students.find(filter_dict).sort(sort_dict).skip(skip).limit(limit).to_list(limit)
            count_task = self.db.students.count_documents(filter_dict)
            
            students, total_count = await asyncio.gather(students_task, count_task)
            
            return {
                "students": students,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total_count,
                    "pages": (total_count + limit - 1) // limit
                }
            }
        except Exception as e:
            logger.error(f"Error getting paginated students: {e}")
            raise
    
    async def get_faculty_paginated(
        self,
        page: int = 1,
        limit: int = 20,
        department: Optional[str] = None,
        subject: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """Get paginated faculty with optimized queries"""
        try:
            # Build filter
            filter_dict = {"is_active": True}
            if department:
                filter_dict["department"] = department
            if subject:
                filter_dict["subjects"] = subject
            if search:
                filter_dict["$text"] = {"$search": search}
            
            # Build sort
            sort_direction = DESCENDING if sort_order == "desc" else ASCENDING
            sort_dict = [(sort_by, sort_direction)]
            
            # Calculate skip
            skip = (page - 1) * limit
            
            # Execute queries in parallel
            faculty_task = self.db.faculty.find(filter_dict).sort(sort_dict).skip(skip).limit(limit).to_list(limit)
            count_task = self.db.faculty.count_documents(filter_dict)
            
            faculty, total_count = await asyncio.gather(faculty_task, count_task)
            
            return {
                "faculty": faculty,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total_count,
                    "pages": (total_count + limit - 1) // limit
                }
            }
        except Exception as e:
            logger.error(f"Error getting paginated faculty: {e}")
            raise
    
    async def get_feedback_analytics(
        self,
        semester: Optional[str] = None,
        academic_year: Optional[str] = None,
        section: Optional[str] = None,
        faculty_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get feedback analytics with optimized aggregation pipeline"""
        try:
            # Build match stage
            match_stage = {}
            if semester:
                match_stage["semester"] = semester
            if academic_year:
                match_stage["academic_year"] = academic_year
            if section:
                match_stage["student_section"] = section
            if faculty_id:
                match_stage["faculty_feedbacks.faculty_id"] = ObjectId(faculty_id)
            
            # Aggregation pipeline
            pipeline = [
                {"$match": match_stage},
                {"$unwind": "$faculty_feedbacks"},
                {"$group": {
                    "_id": {
                        "faculty_id": "$faculty_feedbacks.faculty_id",
                        "section": "$student_section",
                        "semester": "$semester",
                        "academic_year": "$academic_year"
                    },
                    "total_feedbacks": {"$sum": 1},
                    "avg_rating": {"$avg": "$faculty_feedbacks.ratings"},
                    "ratings_distribution": {"$push": "$faculty_feedbacks.ratings"},
                    "comments": {"$push": "$faculty_feedbacks.comments"}
                }},
                {"$group": {
                    "_id": "$_id.faculty_id",
                    "sections": {"$addToSet": "$_id.section"},
                    "semesters": {"$addToSet": "$_id.semester"},
                    "academic_years": {"$addToSet": "$_id.academic_year"},
                    "total_feedbacks": {"$sum": "$total_feedbacks"},
                    "avg_rating": {"$avg": "$avg_rating"},
                    "sections_data": {"$push": {
                        "section": "$_id.section",
                        "semester": "$_id.semester",
                        "academic_year": "$_id.academic_year",
                        "total_feedbacks": "$total_feedbacks",
                        "avg_rating": "$avg_rating"
                    }}
                }},
                {"$lookup": {
                    "from": "faculty",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "faculty_info"
                }},
                {"$unwind": {"path": "$faculty_info", "preserveNullAndEmptyArrays": True}},
                {"$project": {
                    "faculty_id": "$_id",
                    "faculty_name": "$faculty_info.name",
                    "faculty_department": "$faculty_info.department",
                    "sections": 1,
                    "semesters": 1,
                    "academic_years": 1,
                    "total_feedbacks": 1,
                    "avg_rating": {"$round": ["$avg_rating", 2]},
                    "sections_data": 1
                }}
            ]
            
            result = await self.db.feedback_submissions.aggregate(pipeline).to_list(None)
            return {"analytics": result}
        except Exception as e:
            logger.error(f"Error getting feedback analytics: {e}")
            raise
    
    async def get_dashboard_stats(self) -> Dict[str, Any]:
        """Get dashboard statistics with optimized queries"""
        try:
            # Execute multiple queries in parallel
            students_count_task = self.db.students.count_documents({"is_active": True})
            faculty_count_task = self.db.faculty.count_documents({"is_active": True})
            feedback_count_task = self.db.feedback_submissions.count_documents({})
            
            # Get recent feedback submissions
            recent_feedback_task = self.db.feedback_submissions.find(
                {},
                {"submitted_at": 1, "student_section": 1, "semester": 1, "academic_year": 1}
            ).sort([("submitted_at", DESCENDING)]).limit(10).to_list(10)
            
            # Get section-wise student counts
            section_stats_task = self.db.students.aggregate([
                {"$match": {"is_active": True}},
                {"$group": {
                    "_id": "$section",
                    "count": {"$sum": 1}
                }},
                {"$sort": {"count": DESCENDING}}
            ]).to_list(None)
            
            # Get department-wise faculty counts
            department_stats_task = self.db.faculty.aggregate([
                {"$match": {"is_active": True}},
                {"$group": {
                    "_id": "$department",
                    "count": {"$sum": 1}
                }},
                {"$sort": {"count": DESCENDING}}
            ]).to_list(None)
            
            # Wait for all queries to complete
            results = await asyncio.gather(
                students_count_task,
                faculty_count_task,
                feedback_count_task,
                recent_feedback_task,
                section_stats_task,
                department_stats_task
            )
            
            return {
                "total_students": results[0],
                "total_faculty": results[1],
                "total_feedbacks": results[2],
                "recent_feedbacks": results[3],
                "section_stats": results[4],
                "department_stats": results[5]
            }
        except Exception as e:
            logger.error(f"Error getting dashboard stats: {e}")
            raise
    
    async def search_students(
        self,
        query: str,
        limit: int = 20,
        section: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search students with text index optimization"""
        try:
            filter_dict = {"is_active": True}
            if section:
                filter_dict["section"] = section
            
            # Use text search if available
            if query:
                filter_dict["$text"] = {"$search": query}
            
            result = await self.db.students.find(
                filter_dict,
                {"name": 1, "reg_number": 1, "section": 1, "batch_year": 1, "department": 1}
            ).limit(limit).to_list(limit)
            
            return result
        except Exception as e:
            logger.error(f"Error searching students: {e}")
            raise
    
    async def search_faculty(
        self,
        query: str,
        limit: int = 20,
        department: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search faculty with text index optimization"""
        try:
            filter_dict = {"is_active": True}
            if department:
                filter_dict["department"] = department
            
            # Use text search if available
            if query:
                filter_dict["$text"] = {"$search": query}
            
            result = await self.db.faculty.find(
                filter_dict,
                {"name": 1, "email": 1, "department": 1, "subjects": 1}
            ).limit(limit).to_list(limit)
            
            return result
        except Exception as e:
            logger.error(f"Error searching faculty: {e}")
            raise


class ConnectionPoolManager:
    """MongoDB connection pool manager"""
    
    def __init__(self, mongodb_url: str):
        self.mongodb_url = mongodb_url
        self._pool = None
    
    async def get_pool(self):
        """Get or create connection pool"""
        if not self._pool:
            from motor.motor_asyncio import AsyncIOMotorClient
            self._pool = AsyncIOMotorClient(
                self.mongodb_url,
                maxPoolSize=50,
                minPoolSize=10,
                maxIdleTimeMS=30000,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000,
                socketTimeoutMS=20000
            )
        return self._pool
    
    async def close_pool(self):
        """Close connection pool"""
        if self._pool:
            self._pool.close()
            self._pool = None


# Global instances
query_optimizer = None
optimized_queries = None
connection_pool_manager = None


async def initialize_query_optimization(db: AsyncIOMotorDatabase):
    """Initialize query optimization services"""
    global query_optimizer, optimized_queries
    query_optimizer = QueryOptimizer(db)
    optimized_queries = OptimizedQueries(db)
    await query_optimizer.ensure_indexes()
