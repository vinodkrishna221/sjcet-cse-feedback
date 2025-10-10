"""
Database migration system for schema updates and data transformations
"""
import asyncio
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from database import get_database, connect_to_mongo, close_mongo_connection

logger = logging.getLogger(__name__)

class Migration:
    """Base class for database migrations"""
    
    def __init__(self, version: str, description: str):
        self.version = version
        self.description = description
        self.created_at = datetime.utcnow()
    
    async def up(self, db):
        """Apply migration"""
        raise NotImplementedError
    
    async def down(self, db):
        """Rollback migration"""
        raise NotImplementedError

class MigrationManager:
    """Manages database migrations"""
    
    def __init__(self):
        self.db = get_database()
        self.migrations: List[Migration] = []
    
    def register_migration(self, migration: Migration):
        """Register a migration"""
        self.migrations.append(migration)
        self.migrations.sort(key=lambda x: x.version)
    
    async def get_applied_migrations(self) -> List[str]:
        """Get list of applied migrations"""
        try:
            result = await self.db.migrations.find({}, {"version": 1}).to_list(None)
            return [m["version"] for m in result]
        except Exception:
            return []
    
    async def mark_migration_applied(self, version: str):
        """Mark migration as applied"""
        await self.db.migrations.insert_one({
            "version": version,
            "applied_at": datetime.utcnow()
        })
    
    async def mark_migration_rolled_back(self, version: str):
        """Mark migration as rolled back"""
        await self.db.migrations.delete_one({"version": version})
    
    async def run_migrations(self):
        """Run all pending migrations"""
        applied = await self.get_applied_migrations()
        
        for migration in self.migrations:
            if migration.version not in applied:
                try:
                    logger.info(f"Running migration {migration.version}: {migration.description}")
                    await migration.up(self.db)
                    await self.mark_migration_applied(migration.version)
                    logger.info(f"Migration {migration.version} completed successfully")
                except Exception as e:
                    logger.error(f"Migration {migration.version} failed: {e}")
                    raise
    
    async def rollback_migration(self, version: str):
        """Rollback a specific migration"""
        migration = next((m for m in self.migrations if m.version == version), None)
        if not migration:
            raise ValueError(f"Migration {version} not found")
        
        try:
            logger.info(f"Rolling back migration {migration.version}")
            await migration.down(self.db)
            await self.mark_migration_rolled_back(version)
            logger.info(f"Migration {migration.version} rolled back successfully")
        except Exception as e:
            logger.error(f"Rollback of migration {migration.version} failed: {e}")
            raise

# Define migrations
class Migration_001_AddSoftDelete(Migration):
    """Add soft delete fields to all collections"""
    
    def __init__(self):
        super().__init__("001", "Add soft delete fields to all collections")
    
    async def up(self, db):
        collections = ["students", "faculty", "admins", "feedback_submissions"]
        
        for collection_name in collections:
            # Add soft delete fields to existing documents
            await db[collection_name].update_many(
                {"is_active": {"$exists": False}},
                {
                    "$set": {
                        "is_active": True,
                        "deleted_at": None,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
    
    async def down(self, db):
        collections = ["students", "faculty", "admins", "feedback_submissions"]
        
        for collection_name in collections:
            # Remove soft delete fields
            await db[collection_name].update_many(
                {},
                {
                    "$unset": {
                        "is_active": "",
                        "deleted_at": "",
                        "updated_at": ""
                    }
                }
            )

class Migration_002_AddSemesterFields(Migration):
    """Add semester and academic year fields to feedback submissions"""
    
    def __init__(self):
        super().__init__("002", "Add semester and academic year fields to feedback submissions")
    
    async def up(self, db):
        # Add default values for existing feedback submissions
        await db.feedback_submissions.update_many(
            {"semester": {"$exists": False}},
            {
                "$set": {
                    "semester": "S1",
                    "academic_year": "2024-25"
                }
            }
        )
    
    async def down(self, db):
        # Remove semester and academic year fields
        await db.feedback_submissions.update_many(
            {},
            {
                "$unset": {
                    "semester": "",
                    "academic_year": ""
                }
            }
        )

class Migration_003_AddIndexes(Migration):
    """Add performance indexes"""
    
    def __init__(self):
        super().__init__("003", "Add performance indexes")
    
    async def up(self, db):
        # Add compound indexes
        await db.feedback_submissions.create_index([
            ("student_section", 1),
            ("semester", 1),
            ("academic_year", 1),
            ("submitted_at", -1)
        ])
        
        await db.faculty.create_index([
            ("department", 1),
            ("subjects", 1),
            ("is_active", 1)
        ])
        
        await db.students.create_index([
            ("section", 1),
            ("batch_year", 1),
            ("is_active", 1)
        ])
    
    async def down(self, db):
        # Remove indexes (this is complex and usually not needed)
        pass

# Initialize migration manager
migration_manager = MigrationManager()

# Register migrations
migration_manager.register_migration(Migration_001_AddSoftDelete())
migration_manager.register_migration(Migration_002_AddSemesterFields())
migration_manager.register_migration(Migration_003_AddIndexes())

async def run_all_migrations():
    """Run all pending migrations"""
    try:
        await connect_to_mongo()
        await migration_manager.run_migrations()
        print("All migrations completed successfully!")
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        print(f"Migration failed: {e}")
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(run_all_migrations())
