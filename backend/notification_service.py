"""
Notification service for feedback system
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import os
import json
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class NotificationType(Enum):
    FEEDBACK_REMINDER = "feedback_reminder"
    DEADLINE_WARNING = "deadline_warning"
    DEADLINE_PASSED = "deadline_passed"
    FEEDBACK_SUBMITTED = "feedback_submitted"
    REPORT_READY = "report_ready"
    SYSTEM_ANNOUNCEMENT = "system_announcement"

class NotificationChannel(Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"

@dataclass
class NotificationTemplate:
    subject: str
    body: str
    html_body: Optional[str] = None
    channel: NotificationChannel = NotificationChannel.EMAIL

@dataclass
class NotificationRecipient:
    user_id: str
    email: str
    name: str
    phone: Optional[str] = None
    preferences: Dict[str, Any] = None

class NotificationService:
    """Service for sending notifications via various channels"""
    
    def __init__(self):
        self.smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.environ.get('SMTP_PORT', '587'))
        self.smtp_username = os.environ.get('SMTP_USERNAME')
        self.smtp_password = os.environ.get('SMTP_PASSWORD')
        self.from_email = os.environ.get('FROM_EMAIL', 'noreply@college.edu')
        self.from_name = os.environ.get('FROM_NAME', 'Feedback System')
        
        # Notification templates
        self.templates = {
            NotificationType.FEEDBACK_REMINDER: NotificationTemplate(
                subject="Reminder: Submit Your Faculty Feedback",
                body="Dear {name},\n\nThis is a reminder that the feedback submission deadline is approaching.\n\nDeadline: {deadline}\nSemester: {semester}\nAcademic Year: {academic_year}\n\nPlease submit your feedback at your earliest convenience.\n\nBest regards,\nFeedback System",
                html_body="""
                <html>
                <body>
                    <h2>Feedback Submission Reminder</h2>
                    <p>Dear {name},</p>
                    <p>This is a reminder that the feedback submission deadline is approaching.</p>
                    <ul>
                        <li><strong>Deadline:</strong> {deadline}</li>
                        <li><strong>Semester:</strong> {semester}</li>
                        <li><strong>Academic Year:</strong> {academic_year}</li>
                    </ul>
                    <p>Please submit your feedback at your earliest convenience.</p>
                    <p>Best regards,<br>Feedback System</p>
                </body>
                </html>
                """,
                channel=NotificationChannel.EMAIL
            ),
            NotificationType.DEADLINE_WARNING: NotificationTemplate(
                subject="URGENT: Feedback Deadline in 24 Hours",
                body="Dear {name},\n\nThis is an urgent reminder that the feedback submission deadline is in 24 hours.\n\nDeadline: {deadline}\nSemester: {semester}\nAcademic Year: {academic_year}\n\nPlease submit your feedback immediately to avoid missing the deadline.\n\nBest regards,\nFeedback System",
                html_body="""
                <html>
                <body>
                    <h2 style="color: red;">URGENT: Feedback Deadline Warning</h2>
                    <p>Dear {name},</p>
                    <p>This is an urgent reminder that the feedback submission deadline is in 24 hours.</p>
                    <ul>
                        <li><strong>Deadline:</strong> {deadline}</li>
                        <li><strong>Semester:</strong> {semester}</li>
                        <li><strong>Academic Year:</strong> {academic_year}</li>
                    </ul>
                    <p style="color: red;"><strong>Please submit your feedback immediately to avoid missing the deadline.</strong></p>
                    <p>Best regards,<br>Feedback System</p>
                </body>
                </html>
                """,
                channel=NotificationChannel.EMAIL
            ),
            NotificationType.FEEDBACK_SUBMITTED: NotificationTemplate(
                subject="Feedback Submitted Successfully",
                body="Dear {name},\n\nThank you for submitting your faculty feedback.\n\nSubmission Details:\n- Semester: {semester}\n- Academic Year: {academic_year}\n- Faculty Count: {faculty_count}\n- Submitted At: {submitted_at}\n\nYour feedback has been recorded and will be used to improve teaching quality.\n\nBest regards,\nFeedback System",
                html_body="""
                <html>
                <body>
                    <h2>Feedback Submitted Successfully</h2>
                    <p>Dear {name},</p>
                    <p>Thank you for submitting your faculty feedback.</p>
                    <h3>Submission Details:</h3>
                    <ul>
                        <li><strong>Semester:</strong> {semester}</li>
                        <li><strong>Academic Year:</strong> {academic_year}</li>
                        <li><strong>Faculty Count:</strong> {faculty_count}</li>
                        <li><strong>Submitted At:</strong> {submitted_at}</li>
                    </ul>
                    <p>Your feedback has been recorded and will be used to improve teaching quality.</p>
                    <p>Best regards,<br>Feedback System</p>
                </body>
                </html>
                """,
                channel=NotificationChannel.EMAIL
            ),
            NotificationType.REPORT_READY: NotificationTemplate(
                subject="Feedback Report Ready",
                body="Dear {name},\n\nYour requested feedback report is ready for download.\n\nReport Details:\n- Report Type: {report_type}\n- Generated At: {generated_at}\n- Download Link: {download_link}\n\nPlease download the report within 7 days as the link will expire.\n\nBest regards,\nFeedback System",
                html_body="""
                <html>
                <body>
                    <h2>Feedback Report Ready</h2>
                    <p>Dear {name},</p>
                    <p>Your requested feedback report is ready for download.</p>
                    <h3>Report Details:</h3>
                    <ul>
                        <li><strong>Report Type:</strong> {report_type}</li>
                        <li><strong>Generated At:</strong> {generated_at}</li>
                    </ul>
                    <p><a href="{download_link}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Download Report</a></p>
                    <p><small>Please download the report within 7 days as the link will expire.</small></p>
                    <p>Best regards,<br>Feedback System</p>
                </body>
                </html>
                """,
                channel=NotificationChannel.EMAIL
            )
        }
    
    async def send_notification(
        self,
        notification_type: NotificationType,
        recipients: List[NotificationRecipient],
        data: Dict[str, Any],
        channel: Optional[NotificationChannel] = None
    ) -> Dict[str, Any]:
        """Send notification to recipients"""
        try:
            template = self.templates.get(notification_type)
            if not template:
                raise ValueError(f"No template found for notification type: {notification_type}")
            
            channel = channel or template.channel
            results = {
                'success': [],
                'failed': [],
                'total_sent': 0,
                'total_failed': 0
            }
            
            for recipient in recipients:
                try:
                    if channel == NotificationChannel.EMAIL:
                        await self._send_email(recipient, template, data)
                    elif channel == NotificationChannel.SMS:
                        await self._send_sms(recipient, template, data)
                    elif channel == NotificationChannel.IN_APP:
                        await self._send_in_app(recipient, template, data)
                    
                    results['success'].append(recipient.user_id)
                    results['total_sent'] += 1
                    
                except Exception as e:
                    logger.error(f"Failed to send notification to {recipient.user_id}: {e}")
                    results['failed'].append({
                        'user_id': recipient.user_id,
                        'error': str(e)
                    })
                    results['total_failed'] += 1
            
            return results
            
        except Exception as e:
            logger.error(f"Notification service error: {e}")
            raise
    
    async def _send_email(
        self, 
        recipient: NotificationRecipient, 
        template: NotificationTemplate, 
        data: Dict[str, Any]
    ) -> None:
        """Send email notification"""
        try:
            # Format template with data
            subject = template.subject.format(**data)
            body = template.body.format(**data)
            html_body = template.html_body.format(**data) if template.html_body else None
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = recipient.email
            msg['Subject'] = subject
            
            # Add text and HTML parts
            text_part = MIMEText(body, 'plain')
            msg.attach(text_part)
            
            if html_body:
                html_part = MIMEText(html_body, 'html')
                msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {recipient.email}")
            
        except Exception as e:
            logger.error(f"Email sending failed: {e}")
            raise
    
    async def _send_sms(self, recipient: NotificationRecipient, template: NotificationTemplate, data: Dict[str, Any]) -> None:
        """Send SMS notification (placeholder implementation)"""
        # In real implementation, integrate with SMS service like Twilio
        logger.info(f"SMS notification sent to {recipient.phone}")
    
    async def _send_in_app(self, recipient: NotificationRecipient, template: NotificationTemplate, data: Dict[str, Any]) -> None:
        """Send in-app notification (placeholder implementation)"""
        # In real implementation, store notification in database for in-app display
        logger.info(f"In-app notification sent to {recipient.user_id}")
    
    async def send_feedback_reminder(
        self,
        student_id: str,
        deadline: datetime,
        semester: str,
        academic_year: str
    ) -> bool:
        """Send feedback reminder to a specific student"""
        try:
            # Get student details
            from database import DatabaseOperations
            student = await DatabaseOperations.find_one("students", {"id": student_id})
            if not student:
                return False
            
            recipient = NotificationRecipient(
                user_id=student_id,
                email=student.get('email', ''),
                name=student['name'],
                preferences=student.get('notification_preferences', {})
            )
            
            data = {
                'name': student['name'],
                'deadline': deadline.strftime('%Y-%m-%d %H:%M'),
                'semester': semester,
                'academic_year': academic_year
            }
            
            result = await self.send_notification(
                NotificationType.FEEDBACK_REMINDER,
                [recipient],
                data
            )
            
            return result['total_sent'] > 0
            
        except Exception as e:
            logger.error(f"Feedback reminder error: {e}")
            return False
    
    async def send_bulk_reminders(
        self,
        deadline: datetime,
        semester: str,
        academic_year: str,
        section: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send bulk reminders to all students"""
        try:
            from database import DatabaseOperations
            
            # Build filter
            filter_dict = {"is_active": True}
            if section:
                filter_dict["section"] = section
            
            # Get students
            students = await DatabaseOperations.find_many("students", filter_dict)
            
            recipients = []
            for student in students:
                recipients.append(NotificationRecipient(
                    user_id=student['id'],
                    email=student.get('email', ''),
                    name=student['name'],
                    preferences=student.get('notification_preferences', {})
                ))
            
            data = {
                'deadline': deadline.strftime('%Y-%m-%d %H:%M'),
                'semester': semester,
                'academic_year': academic_year
            }
            
            result = await self.send_notification(
                NotificationType.FEEDBACK_REMINDER,
                recipients,
                data
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Bulk reminder error: {e}")
            return {'total_sent': 0, 'total_failed': 0}
    
    async def send_feedback_submission_confirmation(
        self,
        student_id: str,
        semester: str,
        academic_year: str,
        faculty_count: int
    ) -> bool:
        """Send confirmation after feedback submission"""
        try:
            from database import DatabaseOperations
            
            student = await DatabaseOperations.find_one("students", {"id": student_id})
            if not student:
                return False
            
            recipient = NotificationRecipient(
                user_id=student_id,
                email=student.get('email', ''),
                name=student['name']
            )
            
            data = {
                'name': student['name'],
                'semester': semester,
                'academic_year': academic_year,
                'faculty_count': faculty_count,
                'submitted_at': datetime.utcnow().strftime('%Y-%m-%d %H:%M')
            }
            
            result = await self.send_notification(
                NotificationType.FEEDBACK_SUBMITTED,
                [recipient],
                data
            )
            
            return result['total_sent'] > 0
            
        except Exception as e:
            logger.error(f"Submission confirmation error: {e}")
            return False
    
    async def send_report_ready_notification(
        self,
        admin_id: str,
        report_type: str,
        download_link: str
    ) -> bool:
        """Send notification when report is ready"""
        try:
            from database import DatabaseOperations
            
            admin = await DatabaseOperations.find_one("admins", {"id": admin_id})
            if not admin:
                return False
            
            recipient = NotificationRecipient(
                user_id=admin_id,
                email=admin.get('email', ''),
                name=admin['name']
            )
            
            data = {
                'name': admin['name'],
                'report_type': report_type,
                'generated_at': datetime.utcnow().strftime('%Y-%m-%d %H:%M'),
                'download_link': download_link
            }
            
            result = await self.send_notification(
                NotificationType.REPORT_READY,
                [recipient],
                data
            )
            
            return result['total_sent'] > 0
            
        except Exception as e:
            logger.error(f"Report ready notification error: {e}")
            return False
