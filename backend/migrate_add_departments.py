#!/usr/bin/env python3
"""
Migration script to add departments and batch years to existing data
"""
import asyncio
import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables 
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from database import connect_to_mongo, close_mongo_connection, DatabaseOperations

async def migrate_data():
    """Migrate existing data to include departments and batch years"""
    try:
        await connect_to_mongo()
        print("Connected to MongoDB")
        
        # Create initial departments
        departments = [
            {
                "name": "Computer Science and Engineering",
                "code": "CSE",
                "description": "Computer Science and Engineering Department",
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Electronics and Communication Engineering",
                "code": "ECE",
                "description": "Electronics and Communication Engineering Department",
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Artificial Intelligence",
                "code": "AI",
                "description": "Artificial Intelligence Department",
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Data Science",
                "code": "DS",
                "description": "Data Science Department",
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Electrical and Electronics Engineering",
                "code": "EEE",
                "description": "Electrical and Electronics Engineering Department",
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Civil Engineering",
                "code": "CIVIL",
                "description": "Civil Engineering Department",
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Mechanical Engineering",
                "code": "MECH",
                "description": "Mechanical Engineering Department",
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        # Insert departments
        for dept in departments:
            existing = await DatabaseOperations.find_one("departments", {"code": dept["code"]})
            if not existing:
                await DatabaseOperations.insert_one("departments", dept)
                print(f"Created department: {dept['name']} ({dept['code']})")
            else:
                print(f"Department already exists: {dept['name']} ({dept['code']})")
        
        # Create initial batch years for CSE
        batch_years = [
            {
                "year_range": "2024-2028",
                "department": "CSE",
                "sections": ["A", "B", "C", "D"],
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "year_range": "2023-2027",
                "department": "CSE",
                "sections": ["A", "B", "C"],
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "year_range": "2024-2028",
                "department": "ECE",
                "sections": ["A", "B"],
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "year_range": "2024-2028",
                "department": "AI",
                "sections": ["A", "B"],
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "year_range": "2024-2028",
                "department": "DS",
                "sections": ["A", "B"],
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        # Insert batch years
        for batch in batch_years:
            existing = await DatabaseOperations.find_one(
                "batch_years", 
                {
                    "year_range": batch["year_range"],
                    "department": batch["department"]
                }
            )
            if not existing:
                await DatabaseOperations.insert_one("batch_years", batch)
                print(f"Created batch year: {batch['year_range']} {batch['department']}")
            else:
                print(f"Batch year already exists: {batch['year_range']} {batch['department']}")
        
        # Update existing students with default department and batch year
        students = await DatabaseOperations.find_many("students", {"is_active": True})
        updated_students = 0
        
        for student in students:
            update_data = {}
            if not student.get("department"):
                update_data["department"] = "CSE"  # Default to CSE
            if not student.get("batch_year"):
                update_data["batch_year"] = "2024-2028"  # Default batch year
            
            if update_data:
                await DatabaseOperations.update_one(
                    "students",
                    {"id": student["id"]},
                    {"$set": update_data}
                )
                updated_students += 1
        
        print(f"Updated {updated_students} students with department and batch year")
        
        # Update existing faculty with default department
        faculty = await DatabaseOperations.find_many("faculty", {"is_active": True})
        updated_faculty = 0
        
        for member in faculty:
            if not member.get("department"):
                await DatabaseOperations.update_one(
                    "faculty",
                    {"id": member["id"]},
                    {"$set": {"department": "CSE"}}  # Default to CSE
                )
                updated_faculty += 1
        
        print(f"Updated {updated_faculty} faculty members with department")
        
        # Update existing admins with default department for HODs
        admins = await DatabaseOperations.find_many("admins", {"role": "hod"})
        updated_admins = 0
        
        for admin in admins:
            if not admin.get("department"):
                await DatabaseOperations.update_one(
                    "admins",
                    {"id": admin["id"]},
                    {"$set": {"department": "CSE"}}  # Default to CSE
                )
                updated_admins += 1
        
        print(f"Updated {updated_admins} HOD admins with department")
        
        # Add is_active field to existing admins if missing
        admins_without_active = await DatabaseOperations.find_many(
            "admins", 
            {"is_active": {"$exists": False}}
        )
        
        for admin in admins_without_active:
            await DatabaseOperations.update_one(
                "admins",
                {"id": admin["id"]},
                {"$set": {"is_active": True}}
            )
        
        print(f"Updated {len(admins_without_active)} admins with is_active field")
        
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        raise
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(migrate_data())
