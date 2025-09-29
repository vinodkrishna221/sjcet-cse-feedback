from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, timedelta
from models import (
    FeedbackCreate, FeedbackSubmission, APIResponse, Section
)
from database import DatabaseOperations, AnalyticsOperations
from auth import AuthService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feedback", tags=["Feedback"])
security = HTTPBearer()

async def get_current_student(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current student user"""
    student = await AuthService.get_current_student(credentials.credentials)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student access required"
        )
    return student

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to get current admin user"""
    admin = await AuthService.get_current_admin(credentials.credentials)
    if not admin or admin.role not in ["hod", "principal"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return admin

@router.post("/submit", response_model=APIResponse)
async def submit_feedback(
    feedback_data: FeedbackCreate,
    student: Any = Depends(get_current_student)
):
    """Submit anonymous feedback for faculty"""
    try:
        # Validate that student section matches feedback section
        if student.section != feedback_data.student_section:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Feedback section must match your enrolled section"
            )
        
        # Validate faculty IDs exist and teach the section
        for faculty_feedback in feedback_data.faculty_feedbacks:
            faculty = await DatabaseOperations.find_one(
                "faculty",
                {
                    "faculty_id": faculty_feedback.faculty_id,
                    "sections": {"$in": [feedback_data.student_section]},
                    "is_active": True
                }
            )
            
            if not faculty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Faculty {faculty_feedback.faculty_id} not found or doesn't teach section {feedback_data.student_section}"
                )
        
        # Check if student has already submitted feedback recently (optional rate limiting)
        # We can check based on timing and section to prevent spam
        recent_feedback = await DatabaseOperations.find_one(
            "feedback_submissions",
            {
                "student_section": feedback_data.student_section,
                "submitted_at": {"$gte": datetime.utcnow() - timedelta(hours=1)}
            }
        )
        
        # Create feedback submission
        feedback_submission = FeedbackSubmission(
            student_section=feedback_data.student_section,
            semester=feedback_data.semester,
            academic_year=feedback_data.academic_year,
            faculty_feedbacks=feedback_data.faculty_feedbacks,
            is_anonymous=True
        )
        
        # Insert into database
        submission_id = await DatabaseOperations.insert_one(
            "feedback_submissions",
            feedback_submission.dict()
        )
        
        return APIResponse(
            success=True,
            message="Feedback submitted successfully",
            data={"submission_id": submission_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting feedback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error submitting feedback"
        )

@router.get("/analytics/faculty/{faculty_id}", response_model=APIResponse)
async def get_faculty_feedback_analytics(
    faculty_id: str,
    section: Optional[str] = None,
    admin: Any = Depends(get_current_admin)
):
    """Get detailed feedback analytics for a specific faculty member"""
    try:
        # Validate faculty exists
        faculty = await DatabaseOperations.find_one(
            "faculty",
            {"faculty_id": faculty_id, "is_active": True}
        )
        
        if not faculty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty not found"
            )
        
        # Build aggregation pipeline
        match_conditions = {
            "faculty_feedbacks.faculty_id": faculty_id
        }
        
        if section:
            match_conditions["student_section"] = section
        
        pipeline = [
            {"$match": match_conditions},
            {"$unwind": "$faculty_feedbacks"},
            {"$match": {"faculty_feedbacks.faculty_id": faculty_id}},
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
                "question_ratings": {"$push": "$faculty_feedbacks.question_ratings"},
                "suggestions": {"$push": "$faculty_feedbacks.suggestions"},
                "detailed_feedback": {"$push": "$faculty_feedbacks.detailed_feedback"}
            }},
            {"$sort": {"_id.section": 1, "_id.subject": 1}}
        ]
        
        results = await DatabaseOperations.aggregate("feedback_submissions", pipeline)
        
        # Process question-wise ratings
        processed_results = []
        for result in results:
            # Calculate question-wise averages
            question_ratings = {}
            all_question_ratings = result["question_ratings"]
            
            if all_question_ratings:
                # Flatten all question ratings
                for rating_set in all_question_ratings:
                    for question_rating in rating_set:
                        question_id = question_rating["question_id"]
                        if question_id not in question_ratings:
                            question_ratings[question_id] = []
                        question_ratings[question_id].append(question_rating["rating"])
                
                # Calculate averages
                for question_id, ratings in question_ratings.items():
                    question_ratings[question_id] = round(sum(ratings) / len(ratings), 2)
            
            # Calculate rating distribution
            ratings = result["ratings"]
            rating_distribution = {str(i): 0 for i in range(1, 6)}
            for rating in ratings:
                rating_key = str(int(rating))
                if rating_key in rating_distribution:
                    rating_distribution[rating_key] += 1
            
            # Filter out empty suggestions and feedback
            suggestions = [s for s in result["suggestions"] if s and s.strip()]
            detailed_feedback = [f for f in result["detailed_feedback"] if f and f.strip()]
            
            processed_result = {
                "faculty_id": result["_id"]["faculty_id"],
                "faculty_name": result["_id"]["faculty_name"],
                "subject": result["_id"]["subject"],
                "section": result["_id"]["section"],
                "total_feedback_count": result["total_feedback"],
                "average_rating": round(result["average_rating"], 2),
                "question_wise_ratings": question_ratings,
                "rating_distribution": rating_distribution,
                "suggestions": suggestions[:10],  # Limit to 10 latest suggestions
                "detailed_feedback": detailed_feedback[:10]  # Limit to 10 latest feedback
            }
            
            processed_results.append(processed_result)
        
        return APIResponse(
            success=True,
            message="Faculty analytics retrieved successfully",
            data={
                "faculty_analytics": processed_results,
                "total_subjects": len(processed_results)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving faculty analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving faculty analytics"
        )

@router.get("/analytics/section/{section}", response_model=APIResponse)
async def get_section_feedback_analytics(
    section: str,
    admin: Any = Depends(get_current_admin)
):
    """Get feedback analytics for a specific section"""
    try:
        if section.upper() not in ['A', 'B']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Section must be A or B"
            )
        
        section = section.upper()
        
        # Get section-wide analytics
        pipeline = [
            {"$match": {"student_section": section}},
            {"$unwind": "$faculty_feedbacks"},
            {"$group": {
                "_id": {
                    "faculty_id": "$faculty_feedbacks.faculty_id",
                    "faculty_name": "$faculty_feedbacks.faculty_name",
                    "subject": "$faculty_feedbacks.subject"
                },
                "total_feedback": {"$sum": 1},
                "average_rating": {"$avg": "$faculty_feedbacks.overall_rating"}
            }},
            {"$sort": {"average_rating": -1}}
        ]
        
        faculty_analytics = await DatabaseOperations.aggregate("feedback_submissions", pipeline)
        
        # Get overall section statistics
        section_stats_pipeline = [
            {"$match": {"student_section": section}},
            {"$group": {
                "_id": None,
                "total_submissions": {"$sum": 1},
                "average_rating": {"$avg": {"$avg": "$faculty_feedbacks.overall_rating"}},
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
        
        section_stats = await DatabaseOperations.aggregate("feedback_submissions", section_stats_pipeline)
        stats = section_stats[0] if section_stats else {
            "total_submissions": 0,
            "average_rating": 0,
            "recent_submissions": 0
        }
        
        # Get total students in section
        total_students = await DatabaseOperations.count_documents(
            "students",
            {"section": section, "is_active": True}
        )
        
        # Calculate participation rate
        participation_rate = 0
        if total_students > 0:
            participation_rate = round((stats["total_submissions"] / total_students) * 100, 2)
        
        return APIResponse(
            success=True,
            message=f"Section {section} analytics retrieved successfully",
            data={
                "section": section,
                "total_students": total_students,
                "total_submissions": stats["total_submissions"],
                "average_rating": round(stats["average_rating"], 2) if stats["average_rating"] else 0,
                "recent_submissions": stats["recent_submissions"],
                "participation_rate": participation_rate,
                "faculty_analytics": [
                    {
                        "faculty_id": item["_id"]["faculty_id"],
                        "faculty_name": item["_id"]["faculty_name"],
                        "subject": item["_id"]["subject"],
                        "total_feedback": item["total_feedback"],
                        "average_rating": round(item["average_rating"], 2)
                    }
                    for item in faculty_analytics
                ]
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving section analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving section analytics"
        )

@router.get("/analytics/dashboard", response_model=APIResponse)
async def get_dashboard_analytics(admin: Any = Depends(get_current_admin)):
    """Get comprehensive dashboard analytics"""
    try:
        # Get basic statistics
        dashboard_summary = await AnalyticsOperations.get_dashboard_summary()
        
        # Get section-wise analytics
        section_analytics = []
        for section in ['A', 'B']:
            section_stats_pipeline = [
                {"$match": {"student_section": section}},
                {"$group": {
                    "_id": None,
                    "total_submissions": {"$sum": 1},
                    "average_rating": {"$avg": {"$avg": "$faculty_feedbacks.overall_rating"}},
                    "recent_submissions": {
                        "$sum": {
                            "$cond": [
                                {"$gte": ["$submitted_at", datetime.utcnow() - timedelta(days=7)]},
                                1, 0
                            ]
                        }
                    }
                }}
            ]
            
            section_stats = await DatabaseOperations.aggregate("feedback_submissions", section_stats_pipeline)
            stats = section_stats[0] if section_stats else {
                "total_submissions": 0,
                "average_rating": 0,
                "recent_submissions": 0
            }
            
            # Get student count
            total_students = await DatabaseOperations.count_documents(
                "students",
                {"section": section, "is_active": True}
            )
            
            participation_rate = 0
            if total_students > 0:
                participation_rate = round((stats["total_submissions"] / total_students) * 100, 2)
            
            section_analytics.append({
                "section": section,
                "total_students": total_students,
                "total_submissions": stats["total_submissions"],
                "average_rating": round(stats["average_rating"], 2) if stats["average_rating"] else 0,
                "recent_submissions": stats["recent_submissions"],
                "participation_rate": participation_rate
            })
        
        # Get top-rated faculty across all sections
        top_faculty_pipeline = [
            {"$unwind": "$faculty_feedbacks"},
            {"$group": {
                "_id": {
                    "faculty_id": "$faculty_feedbacks.faculty_id",
                    "faculty_name": "$faculty_feedbacks.faculty_name",
                    "subject": "$faculty_feedbacks.subject"
                },
                "total_feedback": {"$sum": 1},
                "average_rating": {"$avg": "$faculty_feedbacks.overall_rating"}
            }},
            {"$match": {"total_feedback": {"$gte": 3}}},  # Only faculty with at least 3 feedback
            {"$sort": {"average_rating": -1}},
            {"$limit": 10}
        ]
        
        top_faculty = await DatabaseOperations.aggregate("feedback_submissions", top_faculty_pipeline)
        
        # Get recent feedback trends (last 7 days)
        recent_trends_pipeline = [
            {
                "$match": {
                    "submitted_at": {"$gte": datetime.utcnow() - timedelta(days=7)}
                }
            },
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$submitted_at"}
                    },
                    "count": {"$sum": 1},
                    "average_rating": {"$avg": {"$avg": "$faculty_feedbacks.overall_rating"}}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        recent_trends = await DatabaseOperations.aggregate("feedback_submissions", recent_trends_pipeline)
        
        return APIResponse(
            success=True,
            message="Dashboard analytics retrieved successfully",
            data={
                **dashboard_summary,
                "section_analytics": section_analytics,
                "top_faculty": [
                    {
                        "faculty_id": item["_id"]["faculty_id"],
                        "faculty_name": item["_id"]["faculty_name"],
                        "subject": item["_id"]["subject"],
                        "total_feedback": item["total_feedback"],
                        "average_rating": round(item["average_rating"], 2)
                    }
                    for item in top_faculty
                ],
                "recent_trends": [
                    {
                        "date": item["_id"],
                        "submissions": item["count"],
                        "average_rating": round(item["average_rating"], 2)
                    }
                    for item in recent_trends
                ]
            }
        )
        
    except Exception as e:
        logger.error(f"Error retrieving dashboard analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving dashboard analytics"
        )

@router.get("/questions", response_model=APIResponse)
async def get_feedback_questions():
    """Get the list of feedback questions"""
    # This matches the questions from the frontend
    questions = [
        {
            "id": "teaching_quality",
            "question": "How would you rate the overall teaching quality?",
            "category": "Teaching"
        },
        {
            "id": "subject_knowledge",
            "question": "How well does the teacher demonstrate subject knowledge?",
            "category": "Knowledge"
        },
        {
            "id": "communication",
            "question": "How clear and effective is the teacher's communication?",
            "category": "Communication"
        },
        {
            "id": "engagement",
            "question": "How engaging are the classes and teaching methods?",
            "category": "Engagement"
        },
        {
            "id": "availability",
            "question": "How accessible is the teacher for doubts and guidance?",
            "category": "Availability"
        },
        {
            "id": "preparation",
            "question": "How well-prepared does the teacher come to class?",
            "category": "Preparation"
        },
        {
            "id": "practical_approach",
            "question": "How effectively does the teacher use practical examples?",
            "category": "Practical"
        },
        {
            "id": "assessment",
            "question": "How fair and helpful are the assessments and feedback?",
            "category": "Assessment"
        },
        {
            "id": "classroom_management",
            "question": "How well does the teacher manage the classroom environment?",
            "category": "Management"
        },
        {
            "id": "motivation",
            "question": "How well does the teacher motivate students to learn?",
            "category": "Motivation"
        }
    ]
    
    return APIResponse(
        success=True,
        message="Feedback questions retrieved successfully",
        data={"questions": questions}
    )

@router.get("/bundles", response_model=APIResponse)
async def get_feedback_bundles(admin: Any = Depends(get_current_admin)):
    """Get all feedback bundles for admin dashboard"""
    try:
        # Get all feedback submissions
        feedback_submissions = await DatabaseOperations.find_many(
            "feedback_submissions",
            {},
            sort=[("submitted_at", -1)]
        )
        
        # Convert to bundled format for frontend compatibility
        bundled_feedback = []
        for submission in feedback_submissions:
            # Create anonymous student identifier
            student_id = f"Student_{submission['anonymous_id'][:8]}"
            
            # Convert faculty feedbacks to the expected format
            teacher_feedbacks = []
            for faculty_feedback in submission.get('faculty_feedbacks', []):
                # Convert question ratings to the expected format
                question_ratings = []
                for q_rating in faculty_feedback.get('question_ratings', []):
                    question_ratings.append({
                        "questionId": q_rating.get('question_id', ''),
                        "question": q_rating.get('question', ''),
                        "rating": q_rating.get('rating', 0)
                    })
                
                teacher_feedbacks.append({
                    "teacherId": faculty_feedback.get('faculty_id', ''),
                    "teacherName": faculty_feedback.get('faculty_name', ''),
                    "subject": faculty_feedback.get('subject', ''),
                    "questionRatings": question_ratings,
                    "overallRating": faculty_feedback.get('overall_rating', 0),
                    "detailedFeedback": faculty_feedback.get('detailed_feedback', ''),
                    "suggestions": faculty_feedback.get('suggestions', '')
                })
            
            bundled_feedback.append({
                "id": submission['id'],
                "studentName": student_id,
                "studentSection": submission.get('student_section', 'A'),
                "teacherFeedbacks": teacher_feedbacks,
                "submittedAt": submission.get('submitted_at', '').isoformat() if submission.get('submitted_at') else ''
            })
        
        return APIResponse(
            success=True,
            message=f"Retrieved {len(bundled_feedback)} feedback bundles",
            data={"bundles": bundled_feedback, "total": len(bundled_feedback)}
        )
        
    except Exception as e:
        logger.error(f"Error retrieving feedback bundles: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving feedback bundles"
        )