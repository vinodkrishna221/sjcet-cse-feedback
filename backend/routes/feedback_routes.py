from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Any, Optional
import logging
import base64
from datetime import datetime, timedelta
from models import (
    FeedbackCreate, FeedbackSubmission, APIResponse, Section, 
    calculate_weighted_score, FEEDBACK_QUESTIONS, GeneratedReport,
    ReportGenerateRequest, ReportHistoryResponse
)
from report_utils import format_report_data, generate_csv_report, generate_excel_report, generate_pdf_report
from database import DatabaseOperations, AnalyticsOperations
from auth import AuthService
from anonymization import AnonymizationService

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
        
        # Check if student has already submitted feedback for this semester
        existing_feedback = await DatabaseOperations.find_one(
            "feedback_submissions",
            {
                "student_id": student.id,
                "semester": feedback_data.semester,
                "academic_year": feedback_data.academic_year
            }
        )
        
        if existing_feedback:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Feedback already submitted for this semester"
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
        
        # Calculate weighted scores for each faculty feedback
        processed_faculty_feedbacks = []
        for faculty_feedback in feedback_data.faculty_feedbacks:
            # Calculate weighted score and grade interpretation
            weighted_score, grade_interpretation = calculate_weighted_score(faculty_feedback.question_ratings)
            
            # Create updated feedback with weighted scoring
            processed_feedback = faculty_feedback.dict()
            processed_feedback['weighted_score'] = weighted_score
            processed_feedback['grade_interpretation'] = grade_interpretation
            
            processed_faculty_feedbacks.append(processed_feedback)
        
        # Create anonymous feedback submission
        anonymous_submission = AnonymizationService.create_anonymous_submission(
            student_id=student.id,
            semester=feedback_data.semester,
            academic_year=feedback_data.academic_year,
            feedback_data={
                'student_section': feedback_data.student_section,
                'faculty_feedbacks': processed_faculty_feedbacks,
                'is_anonymous': feedback_data.is_anonymous
            }
        )
        
        # Add additional metadata
        anonymous_submission.update({
            'student_id': student.id,  # Keep for internal tracking
            'submitted_at': datetime.utcnow(),
            'ip_address': 'hashed',  # In real implementation, hash the actual IP
            'user_agent': 'hashed',  # In real implementation, hash the actual user agent
            'privacy_level': 'high',
            'consent_given': True,
            'data_retention_until': datetime.utcnow() + timedelta(days=2555)  # 7 years
        })
        
        # Insert into database
        submission_id = await DatabaseOperations.insert_one(
            "feedback_submissions",
            anonymous_submission
        )
        
        # Create privacy audit log
        audit_log = AnonymizationService.create_privacy_audit_log(
            action='feedback_submission',
            user_type='student',
            data_type='feedback',
            privacy_level='high',
            additional_info={
                'submission_id': submission_id,
                'faculty_count': len(processed_faculty_feedbacks),
                'is_anonymous': feedback_data.is_anonymous
            }
        )
        
        # Store audit log (in real implementation, store in audit collection)
        logger.info(f"Privacy audit: {audit_log}")
        
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

@router.get("/submission-status", response_model=APIResponse)
async def get_submission_status(
    semester: Optional[str] = None,
    academic_year: Optional[str] = None,
    student: Any = Depends(get_current_student)
):
    """Check if student has already submitted feedback for the current semester"""
    try:
        # Use current semester/year if not provided
        if not semester or not academic_year:
            from datetime import datetime
            now = datetime.utcnow()
            month = now.month
            year = now.year
            
            # Determine semester based on month
            semester = "Even" if month >= 1 and month <= 6 else "Odd"
            academic_year = f"{year}-{year + 1}"
        
        # Debug logging
        logger.info(f"Checking submission status for student ID: {student.id}, semester: {semester}, academic_year: {academic_year}")
        
        # Check if student has already submitted feedback
        existing_feedback = await DatabaseOperations.find_one(
            "feedback_submissions",
            {
                "student_id": student.id,
                "semester": semester,
                "academic_year": academic_year
            }
        )
        
        logger.info(f"Existing feedback found: {existing_feedback is not None}")
        if existing_feedback:
            logger.info(f"Feedback details: {existing_feedback}")
        
        if existing_feedback:
            return APIResponse(
                success=True,
                message="Feedback already submitted",
                data={
                    "has_submitted": True,
                    "submitted_at": existing_feedback.get("submitted_at"),
                    "semester": semester,
                    "academic_year": academic_year,
                    "submission_id": existing_feedback.get("id")
                }
            )
        else:
            return APIResponse(
                success=True,
                message="No feedback submitted yet",
                data={
                    "has_submitted": False,
                    "semester": semester,
                    "academic_year": academic_year
                }
            )
            
    except Exception as e:
        logger.error(f"Error checking submission status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking submission status"
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
                "average_weighted_score": {"$avg": "$faculty_feedbacks.weighted_score"},
                "ratings": {"$push": "$faculty_feedbacks.overall_rating"},
                "weighted_scores": {"$push": "$faculty_feedbacks.weighted_score"},
                "grade_interpretations": {"$push": "$faculty_feedbacks.grade_interpretation"},
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
            
            # Calculate grade distribution
            grade_distribution = {}
            for grade in result.get("grade_interpretations", []):
                grade_distribution[grade] = grade_distribution.get(grade, 0) + 1
            
            processed_result = {
                "faculty_id": result["_id"]["faculty_id"],
                "faculty_name": result["_id"]["faculty_name"],
                "subject": result["_id"]["subject"],
                "section": result["_id"]["section"],
                "total_feedback_count": result["total_feedback"],
                "average_rating": round(result["average_rating"], 2),
                "average_weighted_score": round(result.get("average_weighted_score", 0), 2),
                "question_wise_ratings": question_ratings,
                "rating_distribution": rating_distribution,
                "grade_distribution": grade_distribution,
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
async def get_dashboard_analytics(
    department: Optional[str] = None,
    admin: Any = Depends(get_current_admin)
):
    """Get comprehensive dashboard analytics with optional department filter"""
    try:
        # Build filter criteria for department
        department_filter = {}
        
        # For HOD role, restrict to their department
        if admin.role == "hod" and admin.department:
            department_filter["department"] = admin.department.upper()
        elif department:
            department_filter["department"] = department.upper()
        
        # Get basic statistics
        dashboard_summary = await AnalyticsOperations.get_dashboard_summary(department_filter)
        
        # Get section-wise analytics
        section_analytics = []
        for section in ['A', 'B']:
            # Build match conditions for section and department
            match_conditions = {"student_section": section}
            if department_filter.get("department"):
                match_conditions["department"] = department_filter["department"]
            
            section_stats_pipeline = [
                {"$match": match_conditions},
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
            
            # Get student count with department filter
            student_filter = {"section": section, "is_active": True}
            if department_filter.get("department"):
                student_filter["department"] = department_filter["department"]
            
            total_students = await DatabaseOperations.count_documents(
                "students",
                student_filter
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
    """Get the list of weighted feedback questions"""
    return APIResponse(
        success=True,
        message="Feedback questions retrieved successfully",
        data={"questions": FEEDBACK_QUESTIONS}
    )

@router.get("/bundles", response_model=APIResponse)
async def get_feedback_bundles(
    department: Optional[str] = None,
    admin: Any = Depends(get_current_admin)
):
    """Get all feedback bundles for admin dashboard with optional department filter"""
    try:
        # Build filter criteria
        filter_criteria = {}
        
        # For HOD role, restrict to their department
        if admin.role == "hod" and admin.department:
            filter_criteria["department"] = admin.department.upper()
        elif department:
            filter_criteria["department"] = department.upper()
        
        # Get all feedback submissions
        feedback_submissions = await DatabaseOperations.find_many(
            "feedback_submissions",
            filter_criteria,
            sort={"submitted_at": -1}
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
                        "rating": q_rating.get('rating', 0),
                        "weight": q_rating.get('weight', 0)
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

@router.post("/reports/generate", response_model=APIResponse)
async def generate_feedback_report(
    report_request: ReportGenerateRequest,
    admin: Any = Depends(get_current_admin)
):
    """Generate faculty feedback report for specific section and batch year"""
    try:
        # Validate department access for HOD
        if admin.role == "hod" and admin.department != report_request.department:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only generate reports for your own department"
            )
        
        # Get students in the specified section and batch year
        students = await DatabaseOperations.find_many(
            "students",
            {
                "section": report_request.section,
                "batch_year": report_request.batch_year,
                "department": report_request.department,
                "is_active": True
            }
        )
        
        if not students:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No students found for {report_request.department} - {report_request.batch_year} - Section {report_request.section}"
            )
        
        # Get feedback data for the section
        pipeline = [
            {"$match": {"student_section": report_request.section}},
            {"$unwind": "$faculty_feedbacks"},
            {"$group": {
                "_id": {
                    "faculty_id": "$faculty_feedbacks.faculty_id",
                    "faculty_name": "$faculty_feedbacks.faculty_name",
                    "subject": "$faculty_feedbacks.subject"
                },
                "total_feedback": {"$sum": 1},
                "average_rating": {"$avg": "$faculty_feedbacks.overall_rating"},
                "average_weighted_score": {"$avg": "$faculty_feedbacks.weighted_score"},
                "weighted_scores": {"$push": "$faculty_feedbacks.weighted_score"},
                "question_ratings": {"$push": "$faculty_feedbacks.question_ratings"}
            }},
            {"$sort": {"_id.faculty_name": 1}}
        ]
        
        feedback_data = await DatabaseOperations.aggregate("feedback_submissions", pipeline)
        
        if not feedback_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No feedback data found for the specified criteria"
            )
        
        # Process feedback data for report
        processed_data = []
        for item in feedback_data:
            # Calculate question-wise averages
            question_ratings = {}
            all_question_ratings = item["question_ratings"]
            
            if all_question_ratings:
                for rating_set in all_question_ratings:
                    for question_rating in rating_set:
                        question_id = question_rating["question_id"]
                        if question_id not in question_ratings:
                            question_ratings[question_id] = []
                        question_ratings[question_id].append(question_rating["rating"])
                
                # Calculate averages
                for question_id, ratings in question_ratings.items():
                    question_ratings[question_id] = sum(ratings) / len(ratings)
            
            processed_data.append({
                "faculty_id": item["_id"]["faculty_id"],
                "faculty_name": item["_id"]["faculty_name"],
                "subject": item["_id"]["subject"],
                "total_feedback": item["total_feedback"],
                "average_rating": item["average_rating"],
                "average_weighted_score": item["average_weighted_score"],
                "weighted_scores": item["weighted_scores"],
                "question_wise_ratings": question_ratings
            })
        
        # Format report data
        report_rows, summary_metrics = format_report_data(processed_data)
        
        # Generate report based on format
        report_name = f"Faculty_Report_{report_request.department}_{report_request.batch_year}_Section_{report_request.section}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        if report_request.format == "csv":
            file_content = generate_csv_report(report_rows, summary_metrics, 
                                             report_request.department, report_request.batch_year, report_request.section)
            content_type = "text/csv"
            file_extension = "csv"
        elif report_request.format == "excel":
            file_content = generate_excel_report(report_rows, summary_metrics,
                                               report_request.department, report_request.batch_year, report_request.section)
            content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            file_extension = "xlsx"
        elif report_request.format == "pdf":
            file_content = generate_pdf_report(report_rows, summary_metrics,
                                             report_request.department, report_request.batch_year, report_request.section)
            content_type = "application/pdf"
            file_extension = "pdf"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid format. Must be csv, excel, or pdf"
            )
        
        # Store report metadata
        report_doc = GeneratedReport(
            report_name=report_name,
            department=report_request.department,
            batch_year=report_request.batch_year,
            section=report_request.section,
            generated_by=admin.id,
            report_type=report_request.format,
            file_data=file_content,
            metadata={
                "faculty_count": summary_metrics["total_faculty"],
                "feedback_count": summary_metrics["total_feedback"],
                "section_average": summary_metrics["section_average"],
                "generated_at": datetime.now().isoformat()
            }
        )
        
        report_id = await DatabaseOperations.insert_one("generated_reports", report_doc.dict())
        
        # Encode file content for response
        file_base64 = base64.b64encode(file_content).decode('utf-8')
        
        return APIResponse(
            success=True,
            message=f"Report generated successfully",
            data={
                "report_id": report_id,
                "report_name": report_name,
                "file_content": file_base64,
                "content_type": content_type,
                "file_extension": file_extension,
                "metadata": summary_metrics
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating report"
        )

@router.get("/reports/history", response_model=APIResponse)
async def get_report_history(
    department: Optional[str] = None,
    admin: Any = Depends(get_current_admin)
):
    """Get history of generated reports"""
    try:
        # Build filter based on admin role
        filter_dict = {"is_active": True}
        
        if admin.role == "hod":
            # HOD can only see their department's reports
            filter_dict["department"] = admin.department
        elif department:
            # Principal can filter by department
            filter_dict["department"] = department
        
        # Get reports
        reports = await DatabaseOperations.find_many(
            "generated_reports",
            filter_dict,
            sort=[("created_at", -1)],
            limit=50
        )
        
        # Format response
        report_history = []
        for report in reports:
            # Get admin name who generated the report
            admin_info = await DatabaseOperations.find_one(
                "admins",
                {"id": report["generated_by"]}
            )
            admin_name = admin_info["name"] if admin_info else "Unknown"
            
            report_history.append({
                "id": report["id"],
                "report_name": report["report_name"],
                "department": report["department"],
                "batch_year": report["batch_year"],
                "section": report["section"],
                "generated_by": admin_name,
                "generated_at": report["created_at"],
                "report_type": report["report_type"],
                "metadata": report["metadata"]
            })
        
        return APIResponse(
            success=True,
            message=f"Retrieved {len(report_history)} reports",
            data={"reports": report_history, "total": len(report_history)}
        )
        
    except Exception as e:
        logger.error(f"Error retrieving report history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving report history"
        )

@router.get("/reports/download/{report_id}")
async def download_report(
    report_id: str,
    admin: Any = Depends(get_current_admin)
):
    """Download a specific report"""
    try:
        # Get report
        report = await DatabaseOperations.find_one(
            "generated_reports",
            {"id": report_id, "is_active": True}
        )
        
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Report not found"
            )
        
        # Check access permissions
        if admin.role == "hod" and admin.department != report["department"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only download reports for your own department"
            )
        
        # Determine content type
        content_type_map = {
            "csv": "text/csv",
            "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "pdf": "application/pdf"
        }
        
        content_type = content_type_map.get(report["report_type"], "application/octet-stream")
        
        # Return file content
        from fastapi.responses import Response
        return Response(
            content=report["file_data"],
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={report['report_name']}.{report['report_type'] if report['report_type'] != 'excel' else 'xlsx'}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error downloading report"
        )