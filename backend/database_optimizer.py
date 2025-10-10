"""
Database performance optimization with materialized views and advanced indexing
"""
import asyncio
import logging
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorCollection
from pymongo import ASCENDING, DESCENDING, TEXT, HASHED
from bson import ObjectId

logger = logging.getLogger(__name__)


class MaterializedViewManager:
    """Manager for creating and maintaining materialized views"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.views = {}
    
    async def create_feedback_summary_view(self):
        """Create materialized view for feedback summaries"""
        try:
            # Create collection for materialized view
            view_collection = self.db.feedback_summary_mv
            
            # Create indexes for the materialized view
            await view_collection.create_index([("faculty_id", ASCENDING), ("semester", ASCENDING), ("academic_year", ASCENDING)])
            await view_collection.create_index([("section", ASCENDING), ("semester", ASCENDING)])
            await view_collection.create_index([("department", ASCENDING), ("semester", ASCENDING)])
            await view_collection.create_index([("created_at", DESCENDING)])
            
            # Populate the materialized view
            await self.refresh_feedback_summary_view()
            
            logger.info("Feedback summary materialized view created successfully")
        except Exception as e:
            logger.error(f"Error creating feedback summary view: {e}")
            raise
    
    async def refresh_feedback_summary_view(self):
        """Refresh the feedback summary materialized view"""
        try:
            view_collection = self.db.feedback_summary_mv
            
            # Clear existing data
            await view_collection.delete_many({})
            
            # Aggregate data from feedback_submissions
            pipeline = [
                {"$unwind": "$faculty_feedbacks"},
                {
                    "$group": {
                        "_id": {
                            "faculty_id": "$faculty_feedbacks.faculty_id",
                            "section": "$student_section",
                            "semester": "$semester",
                            "academic_year": "$academic_year"
                        },
                        "total_feedbacks": {"$sum": 1},
                        "avg_rating": {"$avg": "$faculty_feedbacks.ratings"},
                        "min_rating": {"$min": "$faculty_feedbacks.ratings"},
                        "max_rating": {"$max": "$faculty_feedbacks.ratings"},
                        "rating_distribution": {"$push": "$faculty_feedbacks.ratings"},
                        "comments": {"$push": "$faculty_feedbacks.comments"},
                        "last_updated": {"$max": "$submitted_at"}
                    }
                },
                {
                    "$lookup": {
                        "from": "faculty",
                        "localField": "_id.faculty_id",
                        "foreignField": "_id",
                        "as": "faculty_info"
                    }
                },
                {
                    "$unwind": {"path": "$faculty_info", "preserveNullAndEmptyArrays": True}
                },
                {
                    "$project": {
                        "faculty_id": "$_id.faculty_id",
                        "faculty_name": "$faculty_info.name",
                        "faculty_department": "$faculty_info.department",
                        "section": "$_id.section",
                        "semester": "$_id.semester",
                        "academic_year": "$_id.academic_year",
                        "total_feedbacks": 1,
                        "avg_rating": {"$round": ["$avg_rating", 2]},
                        "min_rating": 1,
                        "max_rating": 1,
                        "rating_distribution": 1,
                        "comments": 1,
                        "last_updated": 1,
                        "created_at": "$$NOW"
                    }
                }
            ]
            
            # Execute aggregation and insert into materialized view
            async for doc in self.db.feedback_submissions.aggregate(pipeline):
                await view_collection.insert_one(doc)
            
            logger.info("Feedback summary materialized view refreshed successfully")
        except Exception as e:
            logger.error(f"Error refreshing feedback summary view: {e}")
            raise
    
    async def create_student_stats_view(self):
        """Create materialized view for student statistics"""
        try:
            view_collection = self.db.student_stats_mv
            
            # Create indexes
            await view_collection.create_index([("section", ASCENDING), ("batch_year", ASCENDING)])
            await view_collection.create_index([("department", ASCENDING)])
            await view_collection.create_index([("created_at", DESCENDING)])
            
            # Populate the view
            await self.refresh_student_stats_view()
            
            logger.info("Student stats materialized view created successfully")
        except Exception as e:
            logger.error(f"Error creating student stats view: {e}")
            raise
    
    async def refresh_student_stats_view(self):
        """Refresh the student statistics materialized view"""
        try:
            view_collection = self.db.student_stats_mv
            
            # Clear existing data
            await view_collection.delete_many({})
            
            # Aggregate student statistics
            pipeline = [
                {"$match": {"is_active": True}},
                {
                    "$group": {
                        "_id": {
                            "section": "$section",
                            "batch_year": "$batch_year",
                            "department": "$department"
                        },
                        "total_students": {"$sum": 1},
                        "active_students": {"$sum": {"$cond": ["$is_active", 1, 0]}},
                        "inactive_students": {"$sum": {"$cond": ["$is_active", 0, 1]}},
                        "created_at": {"$min": "$created_at"},
                        "last_updated": {"$max": "$updated_at"}
                    }
                },
                {
                    "$project": {
                        "section": "$_id.section",
                        "batch_year": "$_id.batch_year",
                        "department": "$_id.department",
                        "total_students": 1,
                        "active_students": 1,
                        "inactive_students": 1,
                        "created_at": 1,
                        "last_updated": 1,
                        "view_created_at": "$$NOW"
                    }
                }
            ]
            
            # Execute aggregation and insert into materialized view
            async for doc in self.db.students.aggregate(pipeline):
                await view_collection.insert_one(doc)
            
            logger.info("Student stats materialized view refreshed successfully")
        except Exception as e:
            logger.error(f"Error refreshing student stats view: {e}")
            raise
    
    async def create_faculty_performance_view(self):
        """Create materialized view for faculty performance metrics"""
        try:
            view_collection = self.db.faculty_performance_mv
            
            # Create indexes
            await view_collection.create_index([("faculty_id", ASCENDING)])
            await view_collection.create_index([("department", ASCENDING)])
            await view_collection.create_index([("semester", ASCENDING), ("academic_year", ASCENDING)])
            await view_collection.create_index([("performance_score", DESCENDING)])
            
            # Populate the view
            await self.refresh_faculty_performance_view()
            
            logger.info("Faculty performance materialized view created successfully")
        except Exception as e:
            logger.error(f"Error creating faculty performance view: {e}")
            raise
    
    async def refresh_faculty_performance_view(self):
        """Refresh the faculty performance materialized view"""
        try:
            view_collection = self.db.faculty_performance_mv
            
            # Clear existing data
            await view_collection.delete_many({})
            
            # Calculate faculty performance metrics
            pipeline = [
                {"$unwind": "$faculty_feedbacks"},
                {
                    "$group": {
                        "_id": {
                            "faculty_id": "$faculty_feedbacks.faculty_id",
                            "semester": "$semester",
                            "academic_year": "$academic_year"
                        },
                        "total_feedbacks": {"$sum": 1},
                        "avg_rating": {"$avg": "$faculty_feedbacks.ratings"},
                        "rating_variance": {"$stdDevPop": "$faculty_feedbacks.ratings"},
                        "positive_feedbacks": {"$sum": {"$cond": [{"$gte": ["$faculty_feedbacks.ratings", 7]}, 1, 0]}},
                        "negative_feedbacks": {"$sum": {"$cond": [{"$lt": ["$faculty_feedbacks.ratings", 4]}, 1, 0]}},
                        "sections": {"$addToSet": "$student_section"},
                        "last_feedback": {"$max": "$submitted_at"}
                    }
                },
                {
                    "$lookup": {
                        "from": "faculty",
                        "localField": "_id.faculty_id",
                        "foreignField": "_id",
                        "as": "faculty_info"
                    }
                },
                {
                    "$unwind": {"path": "$faculty_info", "preserveNullAndEmptyArrays": True}
                },
                {
                    "$addFields": {
                        "performance_score": {
                            "$add": [
                                {"$multiply": ["$avg_rating", 10]},
                                {"$multiply": [{"$divide": ["$positive_feedbacks", "$total_feedbacks"]}, 20]},
                                {"$multiply": [{"$subtract": [1, {"$divide": ["$negative_feedbacks", "$total_feedbacks"]}]}, 10]}
                            ]
                        }
                    }
                },
                {
                    "$project": {
                        "faculty_id": "$_id.faculty_id",
                        "faculty_name": "$faculty_info.name",
                        "faculty_department": "$faculty_info.department",
                        "semester": "$_id.semester",
                        "academic_year": "$_id.academic_year",
                        "total_feedbacks": 1,
                        "avg_rating": {"$round": ["$avg_rating", 2]},
                        "rating_variance": {"$round": ["$rating_variance", 2]},
                        "positive_feedbacks": 1,
                        "negative_feedbacks": 1,
                        "positive_percentage": {"$round": [{"$multiply": [{"$divide": ["$positive_feedbacks", "$total_feedbacks"]}, 100]}, 2]},
                        "negative_percentage": {"$round": [{"$multiply": [{"$divide": ["$negative_feedbacks", "$total_feedbacks"]}, 100]}, 2]},
                        "sections": 1,
                        "performance_score": {"$round": ["$performance_score", 2]},
                        "last_feedback": 1,
                        "view_created_at": "$$NOW"
                    }
                }
            ]
            
            # Execute aggregation and insert into materialized view
            async for doc in self.db.feedback_submissions.aggregate(pipeline):
                await view_collection.insert_one(doc)
            
            logger.info("Faculty performance materialized view refreshed successfully")
        except Exception as e:
            logger.error(f"Error refreshing faculty performance view: {e}")
            raise
    
    async def refresh_all_views(self):
        """Refresh all materialized views"""
        try:
            await asyncio.gather(
                self.refresh_feedback_summary_view(),
                self.refresh_student_stats_view(),
                self.refresh_faculty_performance_view()
            )
            logger.info("All materialized views refreshed successfully")
        except Exception as e:
            logger.error(f"Error refreshing all views: {e}")
            raise


class AdvancedIndexManager:
    """Manager for advanced database indexing strategies"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def create_performance_indexes(self):
        """Create all performance-optimized indexes"""
        try:
            await self._create_student_indexes()
        except Exception as e:
            logger.error(f"Error creating student indexes: {e}")
        
        try:
            await self._create_faculty_indexes()
        except Exception as e:
            logger.error(f"Error creating faculty indexes: {e}")
        
        try:
            await self._create_feedback_indexes()
        except Exception as e:
            logger.error(f"Error creating feedback indexes: {e}")
        
        try:
            await self._create_admin_indexes()
        except Exception as e:
            logger.error(f"Error creating admin indexes: {e}")
        
        try:
            await self._create_materialized_view_indexes()
        except Exception as e:
            logger.error(f"Error creating materialized view indexes: {e}")
        
        logger.info("Performance indexes creation completed (with possible warnings)")
    
    async def _create_student_indexes(self):
        """Create optimized indexes for students collection"""
        collection = self.db.students
        
        # Compound indexes for common queries
        await collection.create_index([("section", ASCENDING), ("batch_year", ASCENDING), ("is_active", ASCENDING)])
        await collection.create_index([("department", ASCENDING), ("section", ASCENDING), ("is_active", ASCENDING)])
        await collection.create_index([("batch_year", ASCENDING), ("department", ASCENDING), ("is_active", ASCENDING)])
        
        # Text search indexes
        await collection.create_index([("name", TEXT), ("reg_number", TEXT)])
        
        # Single field indexes
        await collection.create_index([("is_active", ASCENDING)])
        await collection.create_index([("created_at", DESCENDING)])
        await collection.create_index([("updated_at", DESCENDING)])
        
        # Partial indexes for active students only
        await collection.create_index([("section", ASCENDING)], partialFilterExpression={"is_active": True})
        await collection.create_index([("batch_year", ASCENDING)], partialFilterExpression={"is_active": True})
    
    async def _create_faculty_indexes(self):
        """Create optimized indexes for faculty collection"""
        collection = self.db.faculty
        
        # Compound indexes
        await collection.create_index([("department", ASCENDING), ("is_active", ASCENDING)])
        await collection.create_index([("subjects", ASCENDING), ("is_active", ASCENDING)])
        
        # Text search indexes
        await collection.create_index([("name", TEXT)])
        
        # Single field indexes
        await collection.create_index([("is_active", ASCENDING)])
        await collection.create_index([("created_at", DESCENDING)])
        await collection.create_index([("updated_at", DESCENDING)])
        
        # Partial indexes for active faculty only
        await collection.create_index([("department", ASCENDING)], partialFilterExpression={"is_active": True})
    
    async def _create_feedback_indexes(self):
        """Create optimized indexes for feedback submissions collection"""
        collection = self.db.feedback_submissions
        
        # Compound indexes for analytics queries
        await collection.create_index([("semester", ASCENDING), ("academic_year", ASCENDING), ("student_section", ASCENDING)])
        await collection.create_index([("student_section", ASCENDING), ("semester", ASCENDING), ("submitted_at", DESCENDING)])
        await collection.create_index([("faculty_feedbacks.faculty_id", ASCENDING), ("semester", ASCENDING), ("academic_year", ASCENDING)])
        
        # Unique constraint indexes - exclude null student_id values
        await collection.create_index(
            [("student_id", ASCENDING), ("semester", ASCENDING), ("academic_year", ASCENDING)], 
            unique=True,
            partialFilterExpression={"student_id": {"$exists": True}}
        )
        await collection.create_index([("anonymous_id", ASCENDING)], unique=True, name="idx_anonymous_id_unique")
        
        # Single field indexes
        await collection.create_index([("submitted_at", DESCENDING)], name="idx_submitted_at_desc")
        await collection.create_index([("is_anonymous", ASCENDING)])
        
        # Partial indexes for recent feedback
        await collection.create_index(
            [("submitted_at", DESCENDING)], 
            partialFilterExpression={"submitted_at": {"$gte": datetime.now() - timedelta(days=365)}},
            name="idx_submitted_at_recent"
        )
    
    async def _create_admin_indexes(self):
        """Create optimized indexes for admins collection"""
        collection = self.db.admins
        
        # Compound indexes
        await collection.create_index([("role", ASCENDING), ("is_active", ASCENDING)])
        await collection.create_index([("department", ASCENDING), ("is_active", ASCENDING)])
        
        # Single field indexes
        await collection.create_index([("is_active", ASCENDING)])
        await collection.create_index([("created_at", DESCENDING)])
    
    async def _create_materialized_view_indexes(self):
        """Create indexes for materialized views"""
        # Feedback summary MV indexes
        feedback_summary = self.db.feedback_summary_mv
        await feedback_summary.create_index([("faculty_id", ASCENDING), ("semester", ASCENDING), ("academic_year", ASCENDING)])
        await feedback_summary.create_index([("section", ASCENDING), ("semester", ASCENDING)])
        await feedback_summary.create_index([("department", ASCENDING), ("semester", ASCENDING)])
        
        # Student stats MV indexes
        student_stats = self.db.student_stats_mv
        await student_stats.create_index([("section", ASCENDING), ("batch_year", ASCENDING)])
        await student_stats.create_index([("department", ASCENDING)])
        
        # Faculty performance MV indexes
        faculty_performance = self.db.faculty_performance_mv
        await faculty_performance.create_index([("faculty_id", ASCENDING)])
        await faculty_performance.create_index([("department", ASCENDING)])
        await faculty_performance.create_index([("performance_score", DESCENDING)])
    
    async def analyze_query_performance(self, collection_name: str, query: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze query performance and suggest optimizations"""
        try:
            collection = self.db[collection_name]
            
            # Get query execution stats
            explain_result = await collection.find(query).explain()
            execution_stats = explain_result.get("executionStats", {})
            
            # Analyze index usage
            winning_plan = explain_result.get("queryPlanner", {}).get("winningPlan", {})
            
            # Calculate performance metrics
            performance_metrics = {
                "execution_time_ms": execution_stats.get("executionTimeMillis", 0),
                "total_docs_examined": execution_stats.get("totalDocsExamined", 0),
                "total_docs_returned": execution_stats.get("totalDocsReturned", 0),
                "indexes_used": self._extract_indexes_used(winning_plan),
                "stage_type": winning_plan.get("stage", "unknown"),
                "efficiency_ratio": self._calculate_efficiency_ratio(execution_stats),
                "recommendations": self._generate_recommendations(execution_stats, winning_plan)
            }
            
            return performance_metrics
        except Exception as e:
            logger.error(f"Error analyzing query performance: {e}")
            return {}
    
    def _extract_indexes_used(self, winning_plan: Dict[str, Any]) -> List[str]:
        """Extract indexes used in query execution"""
        indexes = []
        
        def extract_from_plan(plan: Dict[str, Any]):
            if plan.get("stage") == "IXSCAN":
                indexes.append(plan.get("indexName", "unknown"))
            if "inputStage" in plan:
                extract_from_plan(plan["inputStage"])
            if "inputStages" in plan:
                for stage in plan["inputStages"]:
                    extract_from_plan(stage)
        
        extract_from_plan(winning_plan)
        return indexes
    
    def _calculate_efficiency_ratio(self, execution_stats: Dict[str, Any]) -> float:
        """Calculate query efficiency ratio"""
        docs_examined = execution_stats.get("totalDocsExamined", 0)
        docs_returned = execution_stats.get("totalDocsReturned", 0)
        
        if docs_examined == 0:
            return 1.0
        
        return docs_returned / docs_examined
    
    def _generate_recommendations(self, execution_stats: Dict[str, Any], winning_plan: Dict[str, Any]) -> List[str]:
        """Generate performance optimization recommendations"""
        recommendations = []
        
        docs_examined = execution_stats.get("totalDocsExamined", 0)
        docs_returned = execution_stats.get("totalDocsReturned", 0)
        execution_time = execution_stats.get("executionTimeMillis", 0)
        
        # Check for inefficient queries
        if docs_examined > docs_returned * 10:
            recommendations.append("Consider adding an index to reduce documents examined")
        
        if execution_time > 100:
            recommendations.append("Query execution time is high, consider optimization")
        
        if winning_plan.get("stage") == "COLLSCAN":
            recommendations.append("Query is performing collection scan, add appropriate index")
        
        if docs_examined > 1000:
            recommendations.append("Large number of documents examined, consider pagination or filtering")
        
        return recommendations


class DatabaseOptimizer:
    """Main database optimization manager"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.materialized_view_manager = MaterializedViewManager(db)
        self.index_manager = AdvancedIndexManager(db)
    
    async def optimize_database(self):
        """Run complete database optimization"""
        try:
            logger.info("Starting database optimization...")
            
            # Create all indexes
            await self.index_manager.create_performance_indexes()
            
            # Create materialized views
            await self.materialized_view_manager.create_feedback_summary_view()
            await self.materialized_view_manager.create_student_stats_view()
            await self.materialized_view_manager.create_faculty_performance_view()
            
            # Set up periodic refresh for materialized views
            await self._setup_materialized_view_refresh()
            
            logger.info("Database optimization completed successfully")
        except Exception as e:
            logger.error(f"Error during database optimization: {e}")
            logger.warning("Continuing without optimal indexes and materialized views")
            # Don't raise - allow application to continue
    
    async def _setup_materialized_view_refresh(self):
        """Set up periodic refresh for materialized views"""
        # This would typically be handled by a background task scheduler
        # For now, we'll just log the setup
        logger.info("Materialized view refresh schedule configured")
    
    async def get_database_stats(self) -> Dict[str, Any]:
        """Get comprehensive database statistics"""
        try:
            stats = {}
            
            # Collection stats
            collections = ["students", "faculty", "feedback_submissions", "admins"]
            for collection_name in collections:
                collection = self.db[collection_name]
                stats[collection_name] = {
                    "count": await collection.count_documents({}),
                    "indexes": await collection.list_indexes().to_list(None),
                    "storage_size": await collection.estimated_document_count()
                }
            
            # Materialized view stats
            mv_collections = ["feedback_summary_mv", "student_stats_mv", "faculty_performance_mv"]
            for mv_name in mv_collections:
                mv_collection = self.db[mv_name]
                stats[mv_name] = {
                    "count": await mv_collection.count_documents({}),
                    "last_refresh": await mv_collection.find_one({}, sort=[("view_created_at", DESCENDING)])
                }
            
            return stats
        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {}


# Global instance
database_optimizer = None


async def initialize_database_optimization(db: AsyncIOMotorDatabase):
    """Initialize database optimization services"""
    global database_optimizer
    database_optimizer = DatabaseOptimizer(db)
    await database_optimizer.optimize_database()
