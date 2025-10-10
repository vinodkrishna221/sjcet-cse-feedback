"""
Migration script to add uniqueness constraint for student feedback per semester
"""
import asyncio
import logging
from database import connect_to_mongo, get_database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def migrate_feedback_uniqueness():
    """Add uniqueness constraint for student feedback per semester"""
    try:
        await connect_to_mongo()
        db = get_database()
        
        # Create compound unique index for student feedback per semester
        # This ensures a student can only submit feedback once per semester
        await db.feedback_submissions.create_index(
            [
                ("student_id", 1),
                ("semester", 1),
                ("academic_year", 1)
            ],
            unique=True,
            partialFilterExpression={"student_id": {"$exists": True}}
        )
        
        logger.info("Created uniqueness constraint for student feedback per semester")
        
        # Also create an index for anonymous feedback tracking
        await db.feedback_submissions.create_index(
            [
                ("anonymous_id", 1),
                ("semester", 1),
                ("academic_year", 1)
            ],
            unique=True
        )
        
        logger.info("Created uniqueness constraint for anonymous feedback per semester")
        
        # Add indexes for performance
        await db.feedback_submissions.create_index([
            ("student_section", 1),
            ("semester", 1),
            ("academic_year", 1),
            ("submitted_at", -1)
        ])
        
        logger.info("Added compound index for feedback queries")
        
        print("Migration completed successfully!")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        print(f"Migration failed: {e}")
    finally:
        from database import close_mongo_connection
        await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(migrate_feedback_uniqueness())
