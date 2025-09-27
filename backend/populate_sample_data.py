#!/usr/bin/env python3
"""
Script to populate sample data for testing the student feedback system
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables 
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from database import connect_to_mongo, close_mongo_connection, DatabaseOperations
from models import Section

async def populate_sample_students():
    """Populate sample students for sections A and B"""
    
    print("🔄 Adding sample students...")
    
    # Sample students for Section A
    section_a_students = [
        {"reg_number": "24G31A0501", "name": "Aditya Kumar", "dob": "2003-05-15", "email": "aditya.k@college.edu", "phone": "9876543201"},
        {"reg_number": "24G31A0502", "name": "Bhavya Sharma", "dob": "2003-06-22", "email": "bhavya.s@college.edu", "phone": "9876543202"},
        {"reg_number": "24G31A0503", "name": "Chetan Reddy", "dob": "2003-07-10", "email": "chetan.r@college.edu", "phone": "9876543203"},
        {"reg_number": "24G31A0504", "name": "Divya Patel", "dob": "2003-08-05", "email": "divya.p@college.edu", "phone": "9876543204"},
        {"reg_number": "24G31A0505", "name": "Eshwar Singh", "dob": "2003-09-18", "email": "eshwar.s@college.edu", "phone": "9876543205"},
        {"reg_number": "24G31A0506", "name": "Fathima Begum", "dob": "2003-10-27", "email": "fathima.b@college.edu", "phone": "9876543206"},
        {"reg_number": "24G31A0507", "name": "Ganesh Rao", "dob": "2003-11-14", "email": "ganesh.r@college.edu", "phone": "9876543207"},
        {"reg_number": "24G31A0508", "name": "Harsha Vardhan", "dob": "2003-12-03", "email": "harsha.v@college.edu", "phone": "9876543208"},
        {"reg_number": "24G31A0509", "name": "Indira Devi", "dob": "2004-01-21", "email": "indira.d@college.edu", "phone": "9876543209"},
        {"reg_number": "24G31A0510", "name": "Jagadish Kumar", "dob": "2004-02-08", "email": "jagadish.k@college.edu", "phone": "9876543210"}
    ]
    
    # Sample students for Section B
    section_b_students = [
        {"reg_number": "24G31A0521", "name": "Kiran Rao", "dob": "2003-01-07", "email": "kiran.r@college.edu", "phone": "9876543221"},
        {"reg_number": "24G31A0522", "name": "Lakshmi Devi", "dob": "2003-02-14", "email": "lakshmi.d@college.edu", "phone": "9876543222"},
        {"reg_number": "24G31A0523", "name": "Mohan Kumar", "dob": "2003-03-21", "email": "mohan.k@college.edu", "phone": "9876543223"},
        {"reg_number": "24G31A0524", "name": "Nandini Reddy", "dob": "2003-04-18", "email": "nandini.r@college.edu", "phone": "9876543224"},
        {"reg_number": "24G31A0525", "name": "Omkar Patel", "dob": "2003-05-25", "email": "omkar.p@college.edu", "phone": "9876543225"},
        {"reg_number": "24G31A0526", "name": "Priya Gupta", "dob": "2003-06-12", "email": "priya.g@college.edu", "phone": "9876543226"},
        {"reg_number": "24G31A0527", "name": "Qasim Ahmed", "dob": "2003-07-29", "email": "qasim.a@college.edu", "phone": "9876543227"},
        {"reg_number": "24G31A0528", "name": "Radha Krishna", "dob": "2003-08-16", "email": "radha.k@college.edu", "phone": "9876543228"},
        {"reg_number": "24G31A0529", "name": "Suresh Babu", "dob": "2003-09-03", "email": "suresh.b@college.edu", "phone": "9876543229"},
        {"reg_number": "24G31A0530", "name": "Tara Devi", "dob": "2003-10-10", "email": "tara.d@college.edu", "phone": "9876543230"}
    ]
    
    success_count = 0
    
    # Insert Section A students
    for student_data in section_a_students:
        try:
            # Check if student already exists
            existing = await DatabaseOperations.find_one("students", {"reg_number": student_data["reg_number"]})
            if existing:
                print(f"⚠️  Student {student_data['reg_number']} already exists, skipping...")
                continue
                
            student_doc = {
                "id": str(uuid.uuid4()),
                "reg_number": student_data["reg_number"],
                "name": student_data["name"],
                "section": "A",
                "dob": student_data["dob"],
                "email": student_data["email"],
                "phone": student_data["phone"],
                "year": "2nd Year",
                "branch": "CSE",
                "is_active": True
            }
            
            await DatabaseOperations.insert_one("students", student_doc)
            success_count += 1
            print(f"✅ Added student: {student_data['name']} ({student_data['reg_number']}) - Section A")
            
        except Exception as e:
            print(f"❌ Error adding student {student_data['reg_number']}: {e}")
    
    # Insert Section B students
    for student_data in section_b_students:
        try:
            # Check if student already exists
            existing = await DatabaseOperations.find_one("students", {"reg_number": student_data["reg_number"]})
            if existing:
                print(f"⚠️  Student {student_data['reg_number']} already exists, skipping...")
                continue
                
            student_doc = {
                "id": str(uuid.uuid4()),
                "reg_number": student_data["reg_number"],
                "name": student_data["name"],
                "section": "B",
                "dob": student_data["dob"],
                "email": student_data["email"],
                "phone": student_data["phone"],
                "year": "2nd Year",
                "branch": "CSE",
                "is_active": True
            }
            
            await DatabaseOperations.insert_one("students", student_doc)
            success_count += 1
            print(f"✅ Added student: {student_data['name']} ({student_data['reg_number']}) - Section B")
            
        except Exception as e:
            print(f"❌ Error adding student {student_data['reg_number']}: {e}")
    
    print(f"\n📊 Students Summary: {success_count} students added successfully")

async def populate_sample_faculty():
    """Populate sample faculty members"""
    
    print("\n🔄 Adding sample faculty...")
    
    sample_faculty = [
        {
            "faculty_id": "CSE001",
            "name": "Dr. Rajesh Kumar",
            "subjects": ["Data Structures", "Algorithms"],
            "sections": ["A", "B"],
            "email": "rajesh.k@college.edu",
            "phone": "9876543101",
            "department": "Computer Science",
            "designation": "Professor"
        },
        {
            "faculty_id": "CSE002",
            "name": "Prof. Meena Sharma",
            "subjects": ["Database Management Systems"],
            "sections": ["A"],
            "email": "meena.s@college.edu",
            "phone": "9876543102",
            "department": "Computer Science",
            "designation": "Associate Professor"
        },
        {
            "faculty_id": "CSE003",
            "name": "Dr. Suresh Patel",
            "subjects": ["Computer Networks"],
            "sections": ["B"],
            "email": "suresh.p@college.edu",
            "phone": "9876543103",
            "department": "Computer Science",
            "designation": "Assistant Professor"
        },
        {
            "faculty_id": "CSE004",
            "name": "Prof. Anita Desai",
            "subjects": ["Operating Systems"],
            "sections": ["A", "B"],
            "email": "anita.d@college.edu",
            "phone": "9876543104",
            "department": "Computer Science",
            "designation": "Associate Professor"
        },
        {
            "faculty_id": "CSE005",
            "name": "Dr. Vikram Singh",
            "subjects": ["Software Engineering"],
            "sections": ["A"],
            "email": "vikram.s@college.edu",
            "phone": "9876543105",
            "department": "Computer Science",
            "designation": "Professor"
        },
        {
            "faculty_id": "CSE006",
            "name": "Prof. Priya Gupta",
            "subjects": ["Web Technologies"],
            "sections": ["B"],
            "email": "priya.g@college.edu",
            "phone": "9876543106",
            "department": "Computer Science",
            "designation": "Assistant Professor"
        },
        {
            "faculty_id": "CSE007",
            "name": "Dr. Arun Verma",
            "subjects": ["Discrete Mathematics"],
            "sections": ["A", "B"],
            "email": "arun.v@college.edu",
            "phone": "9876543107",
            "department": "Computer Science",
            "designation": "Professor"
        },
        {
            "faculty_id": "CSE008",
            "name": "Prof. Kavita Nair",
            "subjects": ["Object Oriented Programming"],
            "sections": ["A", "B"],
            "email": "kavita.n@college.edu",
            "phone": "9876543108",
            "department": "Computer Science",
            "designation": "Associate Professor"
        }
    ]
    
    success_count = 0
    
    for faculty_data in sample_faculty:
        try:
            # Check if faculty already exists
            existing = await DatabaseOperations.find_one("faculty", {"faculty_id": faculty_data["faculty_id"]})
            if existing:
                print(f"⚠️  Faculty {faculty_data['faculty_id']} already exists, skipping...")
                continue
                
            faculty_doc = {
                "id": str(uuid.uuid4()),
                "faculty_id": faculty_data["faculty_id"],
                "name": faculty_data["name"],
                "subjects": faculty_data["subjects"],
                "sections": faculty_data["sections"],
                "email": faculty_data["email"],
                "phone": faculty_data["phone"],
                "department": faculty_data["department"],
                "designation": faculty_data["designation"],
                "is_active": True
            }
            
            await DatabaseOperations.insert_one("faculty", faculty_doc)
            success_count += 1
            print(f"✅ Added faculty: {faculty_data['name']} ({faculty_data['faculty_id']}) - {', '.join(faculty_data['subjects'])}")
            
        except Exception as e:
            print(f"❌ Error adding faculty {faculty_data['faculty_id']}: {e}")
    
    print(f"\n📊 Faculty Summary: {success_count} faculty members added successfully")

async def main():
    """Main function to populate sample data"""
    print("🚀 Starting sample data population...")
    print("=" * 60)
    
    try:
        # Connect to database
        await connect_to_mongo()
        print("✅ Connected to MongoDB")
        
        # Populate students
        await populate_sample_students()
        
        # Populate faculty
        await populate_sample_faculty()
        
        print("\n" + "=" * 60)
        print("🎉 Sample data population completed successfully!")
        print("\n📋 Test Credentials:")
        print("   👨‍🎓 Student Login Examples:")
        print("   • Reg: 24G31A0501, DOB: 2003-05-15 (Aditya Kumar, Section A)")
        print("   • Reg: 24G31A0521, DOB: 2003-01-07 (Kiran Rao, Section B)")
        print("\n   👨‍💼 Admin Login:")
        print("   • HOD: username=hod_cse, password=hod@123")
        print("   • Principal: username=principal, password=principal@123")
        
    except Exception as e:
        print(f"❌ Error during data population: {e}")
    finally:
        await close_mongo_connection()
        print("✅ Database connection closed")

if __name__ == "__main__":
    asyncio.run(main())