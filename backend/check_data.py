#!/usr/bin/env python3
"""
Script to check current database state
"""
import asyncio
import os
import sys
from dotenv import load_dotenv
from pathlib import Path

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables 
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from database import connect_to_mongo, close_mongo_connection, DatabaseOperations

async def check_data():
    """Check current database state"""
    try:
        await connect_to_mongo()
        print("✅ Connected to MongoDB")
        
        # Check collections
        students = await DatabaseOperations.find_many('students', {})
        faculty = await DatabaseOperations.find_many('faculty', {})
        feedback = await DatabaseOperations.find_many('feedback_submissions', {})
        
        print(f"\n📊 Database Summary:")
        print(f"   Students in DB: {len(students)}")
        print(f"   Faculty in DB: {len(faculty)}")
        print(f"   Feedback submissions in DB: {len(feedback)}")
        
        # Check sections
        section_a = await DatabaseOperations.find_many('students', {'section': 'A'})
        section_b = await DatabaseOperations.find_many('students', {'section': 'B'})
        print(f"\n📋 Section Distribution:")
        print(f"   Section A students: {len(section_a)}")
        print(f"   Section B students: {len(section_b)}")
        
        # Show some student details
        print(f"\n👨‍🎓 Student Details:")
        for i, student in enumerate(students[:5]):
            print(f"   {i+1}. {student['name']} ({student['reg_number']}) - Section {student['section']}")
        
        # Show faculty details
        print(f"\n👩‍🏫 Faculty Details:")
        for i, fac in enumerate(faculty[:5]):
            print(f"   {i+1}. {fac['name']} ({fac['faculty_id']}) - {', '.join(fac['subjects'])}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(check_data())