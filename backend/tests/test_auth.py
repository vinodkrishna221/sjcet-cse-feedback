"""
Unit tests for authentication module
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, Mock
import jwt

from auth import AuthService, hash_password, verify_password
from conftest import TestHelpers, TestDataFactory


class TestPasswordHashing:
    """Test password hashing functionality."""
    
    def test_hash_password(self):
        """Test password hashing."""
        password = "TestPassword123!"
        hashed = hash_password(password)
        
        assert hashed != password
        assert len(hashed) > 0
        assert isinstance(hashed, str)
    
    def test_verify_password_correct(self):
        """Test password verification with correct password."""
        password = "TestPassword123!"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) is True
    
    def test_verify_password_incorrect(self):
        """Test password verification with incorrect password."""
        password = "TestPassword123!"
        wrong_password = "WrongPassword123!"
        hashed = hash_password(password)
        
        assert verify_password(wrong_password, hashed) is False
    
    def test_verify_password_invalid_hash(self):
        """Test password verification with invalid hash."""
        password = "TestPassword123!"
        invalid_hash = "invalid_hash"
        
        assert verify_password(password, invalid_hash) is False


class TestAuthService:
    """Test AuthService class methods."""
    
    def test_create_access_token(self):
        """Test access token creation."""
        data = {"sub": "test-user", "role": "admin"}
        token = AuthService.create_access_token(data)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode token to verify contents
        decoded = jwt.decode(token, "test-secret-key-for-testing-only", algorithms=["HS256"])
        assert decoded["sub"] == "test-user"
        assert decoded["role"] == "admin"
        assert "exp" in decoded
    
    def test_create_refresh_token(self):
        """Test refresh token creation."""
        data = {"sub": "test-user", "role": "admin"}
        token = AuthService.create_refresh_token(data)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Decode token to verify contents
        decoded = jwt.decode(token, "test-secret-key-for-testing-only", algorithms=["HS256"])
        assert decoded["sub"] == "test-user"
        assert decoded["role"] == "admin"
        assert decoded["type"] == "refresh"
        assert "exp" in decoded
    
    def test_decode_access_token_valid(self):
        """Test decoding valid access token."""
        data = {"sub": "test-user", "role": "admin"}
        token = AuthService.create_access_token(data)
        
        decoded = AuthService.decode_access_token(token)
        assert decoded is not None
        assert decoded["sub"] == "test-user"
        assert decoded["role"] == "admin"
    
    def test_decode_access_token_invalid(self):
        """Test decoding invalid access token."""
        invalid_token = "invalid.token.here"
        
        decoded = AuthService.decode_access_token(invalid_token)
        assert decoded is None
    
    def test_decode_access_token_expired(self):
        """Test decoding expired access token."""
        # Create token with past expiration
        data = {"sub": "test-user", "role": "admin", "exp": datetime.utcnow() - timedelta(hours=1)}
        token = jwt.encode(data, "test-secret-key-for-testing-only", algorithm="HS256")
        
        decoded = AuthService.decode_access_token(token)
        assert decoded is None
    
    def test_decode_refresh_token_valid(self):
        """Test decoding valid refresh token."""
        data = {"sub": "test-user", "role": "admin"}
        token = AuthService.create_refresh_token(data)
        
        decoded = AuthService.decode_refresh_token(token)
        assert decoded is not None
        assert decoded["sub"] == "test-user"
        assert decoded["role"] == "admin"
        assert decoded["type"] == "refresh"
    
    def test_decode_refresh_token_invalid(self):
        """Test decoding invalid refresh token."""
        invalid_token = "invalid.token.here"
        
        decoded = AuthService.decode_refresh_token(invalid_token)
        assert decoded is None
    
    def test_decode_refresh_token_wrong_type(self):
        """Test decoding access token as refresh token."""
        data = {"sub": "test-user", "role": "admin"}
        token = AuthService.create_access_token(data)
        
        decoded = AuthService.decode_refresh_token(token)
        assert decoded is None


@pytest.mark.asyncio
class TestAuthServiceAsync:
    """Test async AuthService methods."""
    
    async def test_request_password_reset_success(self, test_db, mock_email_service):
        """Test successful password reset request."""
        # Create test admin
        admin_data = TestDataFactory.create_admin_data()
        admin_data["password_hash"] = hash_password(admin_data["password"])
        admin_data["is_active"] = True
        await test_db.admins.insert_one(admin_data)
        
        with patch('auth.AuthService._send_password_reset_email', mock_email_service.send_email):
            result = await AuthService.request_password_reset(admin_data["email"])
            
            assert result is True
            
            # Check that reset token was created
            reset_token = await test_db.password_reset_tokens.find_one({
                "email": admin_data["email"]
            })
            assert reset_token is not None
            assert reset_token["used"] is False
            assert reset_token["expires_at"] > datetime.utcnow()
            
            # Check that email was sent
            emails = mock_email_service.get_sent_emails()
            assert len(emails) == 1
            assert emails[0]["to"] == admin_data["email"]
    
    async def test_request_password_reset_nonexistent_email(self, test_db, mock_email_service):
        """Test password reset request for non-existent email."""
        with patch('auth.AuthService._send_password_reset_email', mock_email_service.send_email):
            result = await AuthService.request_password_reset("nonexistent@example.com")
            
            # Should return True even for non-existent email (security)
            assert result is True
            
            # No reset token should be created
            reset_token = await test_db.password_reset_tokens.find_one({
                "email": "nonexistent@example.com"
            })
            assert reset_token is None
            
            # No email should be sent
            emails = mock_email_service.get_sent_emails()
            assert len(emails) == 0
    
    async def test_reset_password_success(self, test_db):
        """Test successful password reset."""
        # Create test admin
        admin_data = TestDataFactory.create_admin_data()
        admin_data["password_hash"] = hash_password(admin_data["password"])
        admin_data["is_active"] = True
        await test_db.admins.insert_one(admin_data)
        
        # Create reset token
        reset_token_data = {
            "token": "test-reset-token",
            "user_id": admin_data["id"],
            "user_type": "admin",
            "email": admin_data["email"],
            "expires_at": datetime.utcnow() + timedelta(hours=1),
            "used": False,
            "created_at": datetime.utcnow()
        }
        await test_db.password_reset_tokens.insert_one(reset_token_data)
        
        new_password = "NewPassword123!"
        result = await AuthService.reset_password("test-reset-token", new_password)
        
        assert result is True
        
        # Check that password was updated
        updated_admin = await test_db.admins.find_one({"id": admin_data["id"]})
        assert verify_password(new_password, updated_admin["password_hash"]) is True
        
        # Check that reset token was marked as used
        used_token = await test_db.password_reset_tokens.find_one({
            "token": "test-reset-token"
        })
        assert used_token["used"] is True
        assert used_token["used_at"] is not None
    
    async def test_reset_password_invalid_token(self, test_db):
        """Test password reset with invalid token."""
        result = await AuthService.reset_password("invalid-token", "NewPassword123!")
        assert result is False
    
    async def test_reset_password_expired_token(self, test_db):
        """Test password reset with expired token."""
        # Create expired reset token
        reset_token_data = {
            "token": "expired-token",
            "user_id": "test-user",
            "user_type": "admin",
            "email": "test@example.com",
            "expires_at": datetime.utcnow() - timedelta(hours=1),
            "used": False,
            "created_at": datetime.utcnow()
        }
        await test_db.password_reset_tokens.insert_one(reset_token_data)
        
        result = await AuthService.reset_password("expired-token", "NewPassword123!")
        assert result is False
    
    async def test_reset_password_used_token(self, test_db):
        """Test password reset with already used token."""
        # Create used reset token
        reset_token_data = {
            "token": "used-token",
            "user_id": "test-user",
            "user_type": "admin",
            "email": "test@example.com",
            "expires_at": datetime.utcnow() + timedelta(hours=1),
            "used": True,
            "used_at": datetime.utcnow(),
            "created_at": datetime.utcnow()
        }
        await test_db.password_reset_tokens.insert_one(reset_token_data)
        
        result = await AuthService.reset_password("used-token", "NewPassword123!")
        assert result is False


class TestPasswordValidation:
    """Test password validation rules."""
    
    def test_password_too_short(self):
        """Test password that is too short."""
        from models import AdminCreate
        
        with pytest.raises(ValueError, match="Password must be at least 12 characters long"):
            AdminCreate(
                name="Test Admin",
                email="test@example.com",
                role="admin",
                password="Short123!"
            )
    
    def test_password_no_uppercase(self):
        """Test password without uppercase letter."""
        from models import AdminCreate
        
        with pytest.raises(ValueError, match="Password must contain at least one uppercase letter"):
            AdminCreate(
                name="Test Admin",
                email="test@example.com",
                role="admin",
                password="testpassword123!"
            )
    
    def test_password_no_lowercase(self):
        """Test password without lowercase letter."""
        from models import AdminCreate
        
        with pytest.raises(ValueError, match="Password must contain at least one lowercase letter"):
            AdminCreate(
                name="Test Admin",
                email="test@example.com",
                role="admin",
                password="TESTPASSWORD123!"
            )
    
    def test_password_no_digit(self):
        """Test password without digit."""
        from models import AdminCreate
        
        with pytest.raises(ValueError, match="Password must contain at least one digit"):
            AdminCreate(
                name="Test Admin",
                email="test@example.com",
                role="admin",
                password="TestPassword!"
            )
    
    def test_password_no_special_char(self):
        """Test password without special character."""
        from models import AdminCreate
        
        with pytest.raises(ValueError, match="Password must contain at least one special character"):
            AdminCreate(
                name="Test Admin",
                email="test@example.com",
                role="admin",
                password="TestPassword123"
            )
    
    def test_password_consecutive_chars(self):
        """Test password with consecutive identical characters."""
        from models import AdminCreate
        
        with pytest.raises(ValueError, match="Password cannot contain more than 2 consecutive identical characters"):
            AdminCreate(
                name="Test Admin",
                email="test@example.com",
                role="admin",
                password="TestPassword111!"
            )
    
    def test_password_common_sequence(self):
        """Test password with common sequences."""
        from models import AdminCreate
        
        with pytest.raises(ValueError, match="Password cannot contain common sequences"):
            AdminCreate(
                name="Test Admin",
                email="test@example.com",
                role="admin",
                password="TestPassword123!"
            )
    
    def test_password_valid(self):
        """Test valid password."""
        from models import AdminCreate
        
        admin = AdminCreate(
            name="Test Admin",
            email="test@example.com",
            role="admin",
            password="ValidPassword123!"
        )
        
        assert admin.password == "ValidPassword123!"


class TestTokenExpiration:
    """Test token expiration handling."""
    
    def test_access_token_expiration(self):
        """Test access token expiration time."""
        data = {"sub": "test-user", "role": "admin"}
        token = AuthService.create_access_token(data)
        
        decoded = jwt.decode(token, "test-secret-key-for-testing-only", algorithms=["HS256"])
        exp_time = datetime.fromtimestamp(decoded["exp"])
        expected_exp = datetime.utcnow() + timedelta(hours=2)
        
        # Allow 1 minute tolerance
        assert abs((exp_time - expected_exp).total_seconds()) < 60
    
    def test_refresh_token_expiration(self):
        """Test refresh token expiration time."""
        data = {"sub": "test-user", "role": "admin"}
        token = AuthService.create_refresh_token(data)
        
        decoded = jwt.decode(token, "test-secret-key-for-testing-only", algorithms=["HS256"])
        exp_time = datetime.fromtimestamp(decoded["exp"])
        expected_exp = datetime.utcnow() + timedelta(days=7)
        
        # Allow 1 minute tolerance
        assert abs((exp_time - expected_exp).total_seconds()) < 60
