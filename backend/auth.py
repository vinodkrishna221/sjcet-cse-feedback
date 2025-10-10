from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
import os
import logging
import bcrypt
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from models import Admin, Student
from database import DatabaseOperations

logger = logging.getLogger(__name__)

# Password hashing - use bcrypt directly for better compatibility
def hash_password(password: str) -> str:
    """Hash password using bcrypt directly"""
    # Use bcrypt with proper handling for longer passwords
    password_bytes = password.encode('utf-8')
    # Use bcrypt with higher rounds for better security
    salt = bcrypt.gensalt(rounds=14)
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password using bcrypt directly"""
    try:
        password_bytes = plain_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))
    except Exception as e:
        logger.error(f"Password verification failed: {e}")
        return False

# JWT settings
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is required for security")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))  # 2 hours default
REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))  # 7 days default

class AuthService:
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return verify_password(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash password"""
        try:
            return hash_password(password)
        except Exception as e:
            logger.error(f"Password hashing error: {e}")
            raise ValueError("Password hashing failed")
    
    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: Dict[str, Any]) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
        """Decode JWT access token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != "access":
                return None
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    def decode_refresh_token(token: str) -> Optional[Dict[str, Any]]:
        """Decode JWT refresh token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != "refresh":
                return None
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    async def authenticate_admin(username: str, password: str) -> Optional[Admin]:
        """Authenticate admin user"""
        admin_data = await DatabaseOperations.find_one(
            "admins", 
            {"username": username}
        )
        
        if not admin_data:
            return None
        
        # Password will be handled by the verify_password function
        
        try:
            if not AuthService.verify_password(password, admin_data["password_hash"]):
                return None
        except Exception as e:
            # If password verification fails due to bcrypt issues, return None
            print(f"Password verification error for {username}: {e}")
            return None
            
        return Admin(**admin_data)
    
    @staticmethod
    async def authenticate_student(reg_number: str, dob: str) -> Optional[Student]:
        """Authenticate student using registration number and DOB"""
        student_data = await DatabaseOperations.find_one(
            "students",
            {
                "reg_number": reg_number.upper(),
                "dob": dob,
                "is_active": True
            }
        )
        
        if not student_data:
            return None
            
        return Student(**student_data)
    
    @staticmethod
    async def get_current_admin(token: str) -> Optional[Admin]:
        """Get current admin from token"""
        payload = AuthService.decode_access_token(token)
        if not payload:
            return None
            
        admin_id = payload.get("sub")
        if not admin_id:
            return None
            
        admin_data = await DatabaseOperations.find_one("admins", {"id": admin_id})
        if not admin_data:
            return None
            
        return Admin(**admin_data)
    
    @staticmethod
    async def get_current_student(token: str) -> Optional[Student]:
        """Get current student from token"""
        payload = AuthService.decode_access_token(token)
        if not payload:
            return None
            
        student_id = payload.get("sub")
        if not student_id:
            return None
            
        student_data = await DatabaseOperations.find_one(
            "students", 
            {"id": student_id, "is_active": True}
        )
        if not student_data:
            return None
            
        return Student(**student_data)
    
    @staticmethod
    async def request_password_reset(email: str) -> bool:
        """Request password reset for admin user"""
        try:
            # Find admin by email
            admin_data = await DatabaseOperations.find_one(
                "admins",
                {"email": email, "is_active": True}
            )
            
            if not admin_data:
                # Don't reveal if email exists or not
                return True
            
            # Generate reset token
            reset_token = secrets.token_urlsafe(32)
            expires_at = datetime.utcnow() + timedelta(hours=1)  # 1 hour expiry
            
            # Store reset token in database
            await DatabaseOperations.insert_one("password_reset_tokens", {
                "token": reset_token,
                "user_id": admin_data["id"],
                "user_type": "admin",
                "email": email,
                "expires_at": expires_at,
                "used": False,
                "created_at": datetime.utcnow()
            })
            
            # Send reset email
            await AuthService._send_password_reset_email(email, reset_token)
            
            return True
            
        except Exception as e:
            logger.error(f"Password reset request error: {e}")
            return True  # Don't reveal errors
    
    @staticmethod
    async def reset_password(token: str, new_password: str) -> bool:
        """Reset password using token"""
        try:
            # Find valid reset token
            reset_data = await DatabaseOperations.find_one(
                "password_reset_tokens",
                {
                    "token": token,
                    "used": False,
                    "expires_at": {"$gt": datetime.utcnow()}
                }
            )
            
            if not reset_data:
                return False
            
            # Hash new password
            password_hash = AuthService.get_password_hash(new_password)
            
            # Update user password
            if reset_data["user_type"] == "admin":
                await DatabaseOperations.update_one(
                    "admins",
                    {"id": reset_data["user_id"]},
                    {"password_hash": password_hash}
                )
            else:
                # Student password reset not implemented yet
                return False
            
            # Mark token as used
            await DatabaseOperations.update_one(
                "password_reset_tokens",
                {"token": token},
                {"used": True, "used_at": datetime.utcnow()}
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Password reset error: {e}")
            return False
    
    @staticmethod
    async def _send_password_reset_email(email: str, token: str):
        """Send password reset email"""
        try:
            # Email configuration
            smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
            smtp_port = int(os.environ.get("SMTP_PORT", "587"))
            smtp_username = os.environ.get("SMTP_USERNAME")
            smtp_password = os.environ.get("SMTP_PASSWORD")
            
            if not smtp_username or not smtp_password:
                logger.warning("SMTP credentials not configured, skipping email send")
                return
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = smtp_username
            msg['To'] = email
            msg['Subject'] = "Password Reset Request - Student Feedback System"
            
            # Email body
            reset_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token={token}"
            body = f"""
            You have requested a password reset for your account.
            
            Click the link below to reset your password:
            {reset_url}
            
            This link will expire in 1 hour.
            
            If you did not request this password reset, please ignore this email.
            
            Best regards,
            Student Feedback System Team
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(smtp_username, smtp_password)
            text = msg.as_string()
            server.sendmail(smtp_username, email, text)
            server.quit()
            
            logger.info(f"Password reset email sent to {email}")
            
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")

class AuthHelpers:
    
    @staticmethod
    async def initialize_admin_accounts():
        """Initialize default admin accounts (HOD and Principal)"""
        import uuid
        
        admins_to_create = [
            {
                "username": "hod_cse",
                "password": "hod@123",
                "name": "Dr. CSE HOD",
                "role": "hod",
                "email": "hod.cse@college.edu",
                "phone": "+91-9876543100"
            },
            {
                "username": "principal",
                "password": "principal@123", 
                "name": "Dr. Principal",
                "role": "principal",
                "email": "principal@college.edu",
                "phone": "+91-9876543101"
            }
        ]
        
        for admin_data in admins_to_create:
            try:
                logger.info(f"Initializing admin account: {admin_data['username']}")
                
                # Delete existing admin if exists
                await DatabaseOperations.delete_one(
                    "admins",
                    {"username": admin_data["username"]}
                )
                
                # Create new admin with proper password handling
                password = admin_data["password"]
                logger.info(f"Password length: {len(password.encode('utf-8'))} bytes")
                
                logger.info(f"Attempting to hash password for {admin_data['username']}")
                password_hash = AuthService.get_password_hash(password)
                logger.info(f"Password hashed successfully for {admin_data['username']}")
                
                admin_doc = {
                    "id": str(uuid.uuid4()),  # Generate UUID for id field
                    "username": admin_data["username"],
                    "password_hash": password_hash,
                    "name": admin_data["name"],
                    "role": admin_data["role"],
                    "email": admin_data.get("email"),
                    "phone": admin_data.get("phone")
                }
                
                await DatabaseOperations.insert_one("admins", admin_doc)
                logger.info(f"Created admin account: {admin_data['username']} with ID: {admin_doc['id']}")
                print(f"Created admin account: {admin_data['username']} with ID: {admin_doc['id']}")
            except Exception as e:
                logger.error(f"Error creating admin {admin_data['username']}: {e}")
                print(f"Error creating admin {admin_data['username']}: {e}")
    
    @staticmethod
    def create_user_response(user_data: Dict[str, Any], role: str) -> Dict[str, Any]:
        """Create standardized user response"""
        if role == "student":
            return {
                "id": user_data["id"],
                "role": "student",
                "name": user_data["name"],
                "section": user_data["section"],
                "regNumber": user_data["reg_number"],
                "email": user_data.get("email"),
                "phone": user_data.get("phone")
            }
        else:  # admin (hod/principal)
            return {
                "id": user_data["id"],
                "role": user_data["role"],
                "name": user_data["name"],
                "email": user_data.get("email"),
                "phone": user_data.get("phone")
            }