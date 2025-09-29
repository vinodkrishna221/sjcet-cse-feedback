#!/usr/bin/env python3
"""
Script to populate sample feedback data for testing analytics and reporting
"""
import asyncio
import os
import sys
import uuid
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pathlib import Path

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables 
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from database import connect_to_mongo, close_mongo_connection, DatabaseOperations

# Predefined feedback questions (matching the system)
FEEDBACK_QUESTIONS = [
    {"id": "q1", "question": "The teacher explains concepts clearly and is easy to understand"},
    {"id": "q2", "question": "The teacher is well-prepared for each class"},
    {"id": "q3", "question": "The teacher encourages questions and class participation"},
    {"id": "q4", "question": "The teacher provides helpful feedback on assignments and tests"},
    {"id": "q5", "question": "The teacher is available during office hours for help"},
    {"id": "q6", "question": "The course content is organized and follows a logical sequence"},
    {"id": "q7", "question": "The teaching methods help me understand the subject better"},
    {"id": "q8", "question": "The teacher treats all students fairly and respectfully"},
    {"id": "q9", "question": "The pace of the course is appropriate for learning"},
    {"id": "q10", "question": "Overall, I would recommend this teacher to other students"}
]

# Sample detailed feedback comments
DETAILED_FEEDBACK_COMMENTS = [
    "Excellent teaching methodology and very supportive",
    "Great explanation of complex topics with real-world examples",
    "Very patient and helpful in answering doubts",
    "Could improve on providing more practical examples",
    "Teaching style is engaging and interactive",
    "Well-structured course content and good pacing",
    "Sometimes moves too fast through difficult concepts",
    "Provides excellent feedback on assignments",
    "Very knowledgeable and passionate about the subject",
    "Could use more visual aids during explanations"
]

SUGGESTIONS = [
    "Please provide more hands-on practice sessions",
    "Include more real-world applications and case studies",
    "Slow down a bit when explaining complex algorithms",
    "Provide additional reference materials for self-study",
    "Conduct more interactive sessions and group discussions",
    "Upload lecture notes before the class",
    "Give more time for questions at the end of each lecture",
    "Include more programming examples and live coding",
    "Provide clearer guidelines for assignments",
    "Organize extra doubt clearing sessions before exams"
]

async def get_students_and_faculty():
    """Get all students and faculty from database"""
    try:
        students = await DatabaseOperations.find_many("students", {"is_active": True})
        faculty = await DatabaseOperations.find_many("faculty", {"is_active": True})
        return students, faculty
    except Exception as e:
        print(f"❌ Error fetching students and faculty: {e}")
        return [], []

def generate_question_ratings(faculty_performance_level="good"):
    """Generate realistic question ratings based on performance level"""
    ratings = []
    
    # Define rating ranges based on performance level
    if faculty_performance_level == "excellent":
        rating_range = [4, 5]
        weights = [0.3, 0.7]  # 70% chance of 5, 30% chance of 4
    elif faculty_performance_level == "good":
        rating_range = [3, 4, 5]
        weights = [0.2, 0.5, 0.3]  # Mostly 4s with some 3s and 5s
    elif faculty_performance_level == "average":
        rating_range = [2, 3, 4]
        weights = [0.2, 0.6, 0.2]  # Mostly 3s
    else:  # below_average
        rating_range = [1, 2, 3]
        weights = [0.2, 0.5, 0.3]  # Mostly 2s with some 1s and 3s
    
    for question in FEEDBACK_QUESTIONS:
        rating = random.choices(rating_range, weights=weights)[0]
        ratings.append({
            "question_id": question["id"],
            "question": question["question"],
            "rating": rating
        })
    
    return ratings

def calculate_overall_rating(question_ratings):
    """Calculate overall rating from question ratings"""
    if not question_ratings:
        return 3.0
    
    total_rating = sum(q["rating"] for q in question_ratings)
    return round(total_rating / len(question_ratings), 1)

async def create_sample_feedback():
    """Create sample feedback submissions"""
    print("🔄 Creating sample feedback submissions...")
    
    students, faculty = await get_students_and_faculty()
    
    if not students or not faculty:
        print("❌ No students or faculty found in database")
        return
    
    print(f"📊 Found {len(students)} students and {len(faculty)} faculty members")
    
    # Define performance levels for different faculty (for realistic data)
    faculty_performance = {
        "CSE001": "excellent",  # Dr. Rajesh Kumar
        "CSE002": "good",       # Prof. Meena Sharma
        "CSE003": "average",    # Dr. Suresh Patel
        "CSE004": "good",       # Prof. Anita Desai
        "CSE005": "excellent",  # Dr. Vikram Singh
        "CSE006": "average",    # Prof. Priya Gupta
        "CSE007": "good",       # Dr. Arun Verma
        "CSE008": "good"        # Prof. Kavita Nair
    }
    
    submissions_created = 0
    current_date = datetime.utcnow()
    
    # Create feedback for the last 30 days (simulate gradual submission)
    for days_ago in range(30, 0, -1):
        submission_date = current_date - timedelta(days=days_ago)
        
        # Random number of submissions per day (0-3)
        daily_submissions = random.randint(0, 3)
        
        for _ in range(daily_submissions):
            # Select random students (simulate different students giving feedback)
            selected_students_count = random.randint(5, min(15, len(students)))
            selected_students = random.sample(students, selected_students_count)
            
            # Group students by section for realistic feedback
            section_students = {}
            for student in selected_students:
                section = student["section"]
                if section not in section_students:
                    section_students[section] = []
                section_students[section].append(student)
            
            # Create feedback for each section
            for section, section_student_list in section_students.items():
                try:
                    # Get faculty teaching this section
                    section_faculty = [f for f in faculty if section in f["sections"]]
                    
                    if not section_faculty:
                        continue
                    
                    # Create faculty feedback list
                    faculty_feedbacks = []
                    
                    for fac in section_faculty:
                        # Get random subject for this faculty
                        subject = random.choice(fac["subjects"])
                        performance_level = faculty_performance.get(fac["faculty_id"], "good")
                        
                        # Generate question ratings
                        question_ratings = generate_question_ratings(performance_level)
                        overall_rating = calculate_overall_rating(question_ratings)
                        
                        # Add some randomness to detailed feedback
                        detailed_feedback = None
                        suggestions = None
                        
                        if random.random() < 0.7:  # 70% chance of detailed feedback
                            detailed_feedback = random.choice(DETAILED_FEEDBACK_COMMENTS)
                        
                        if random.random() < 0.5:  # 50% chance of suggestions
                            suggestions = random.choice(SUGGESTIONS)
                        
                        faculty_feedbacks.append({
                            "faculty_id": fac["faculty_id"],
                            "faculty_name": fac["name"],
                            "subject": subject,
                            "question_ratings": question_ratings,
                            "overall_rating": overall_rating,
                            "detailed_feedback": detailed_feedback,
                            "suggestions": suggestions
                        })
                    
                    # Create feedback submission document
                    feedback_doc = {
                        "id": str(uuid.uuid4()),
                        "student_section": section,
                        "semester": "3rd Semester",
                        "academic_year": "2024-25",
                        "faculty_feedbacks": faculty_feedbacks,
                        "created_at": submission_date,
                        "updated_at": submission_date,
                        "submitted_at": submission_date,
                        "is_anonymous": True,
                        "anonymous_id": str(uuid.uuid4())
                    }
                    
                    # Insert feedback submission
                    await DatabaseOperations.insert_one("feedback_submissions", feedback_doc)
                    submissions_created += 1
                    
                    print(f"✅ Created feedback for Section {section} with {len(faculty_feedbacks)} faculty ratings")
                    
                except Exception as e:
                    print(f"❌ Error creating feedback for section {section}: {e}")
    
    print(f"\n📊 Feedback Summary: {submissions_created} feedback submissions created")

async def main():
    """Main function to populate feedback data"""
    print("🚀 Starting sample feedback data population...")
    print("=" * 60)
    
    try:
        # Connect to database
        await connect_to_mongo()
        print("✅ Connected to MongoDB")
        
        # Create sample feedback
        await create_sample_feedback()
        
        print("\n" + "=" * 60)
        print("🎉 Sample feedback data population completed successfully!")
        print("\n📋 Analytics Features Now Available:")
        print("   📊 HOD Dashboard: Section-wise feedback analytics")
        print("   📈 Principal Dashboard: Overall institutional reports")
        print("   📋 Faculty Performance: Individual faculty ratings and trends")
        print("   🎯 Detailed Insights: Question-wise analysis and suggestions")
        
    except Exception as e:
        print(f"❌ Error during feedback data population: {e}")
    finally:
        await close_mongo_connection()
        print("✅ Database connection closed")

if __name__ == "__main__":
    asyncio.run(main())