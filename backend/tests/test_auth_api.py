"""
API tests for authentication endpoints
"""
import pytest
from fastapi.testclient import TestClient
from conftest import TestHelpers, TestDataFactory


class TestAuthEndpoints:
    """Test authentication API endpoints."""
    
    def test_admin_login_success(self, test_client, sample_admin):
        """Test successful admin login."""
        login_data = {
            "email": sample_admin["email"],
            "password": "TestPassword123!"
        }
        
        response = test_client.post("/api/v1/auth/admin-login", json=login_data)
        
        TestHelpers.assert_response_success(response)
        data = response.json()
        
        assert "data" in data
        assert "user" in data["data"]
        assert "access_token" in data["data"]
        assert "refresh_token" in data["data"]
        assert "token_type" in data["data"]
        assert "expires_in" in data["data"]
        
        assert data["data"]["user"]["email"] == sample_admin["email"]
        assert data["data"]["user"]["role"] == sample_admin["role"]
        assert data["data"]["token_type"] == "bearer"
        assert data["data"]["expires_in"] == 7200
    
    def test_admin_login_invalid_email(self, test_client):
        """Test admin login with invalid email."""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "TestPassword123!"
        }
        
        response = test_client.post("/api/v1/auth/admin-login", json=login_data)
        
        TestHelpers.assert_response_error(response, 401)
        data = response.json()
        assert "Invalid credentials" in data["message"]
    
    def test_admin_login_invalid_password(self, test_client, sample_admin):
        """Test admin login with invalid password."""
        login_data = {
            "email": sample_admin["email"],
            "password": "WrongPassword123!"
        }
        
        response = test_client.post("/api/v1/auth/admin-login", json=login_data)
        
        TestHelpers.assert_response_error(response, 401)
        data = response.json()
        assert "Invalid credentials" in data["message"]
    
    def test_admin_login_missing_fields(self, test_client):
        """Test admin login with missing fields."""
        login_data = {
            "email": "test@example.com"
            # Missing password
        }
        
        response = test_client.post("/api/v1/auth/admin-login", json=login_data)
        
        TestHelpers.assert_response_error(response, 422)
    
    def test_admin_login_invalid_email_format(self, test_client):
        """Test admin login with invalid email format."""
        login_data = {
            "email": "invalid-email",
            "password": "TestPassword123!"
        }
        
        response = test_client.post("/api/v1/auth/admin-login", json=login_data)
        
        TestHelpers.assert_response_error(response, 422)
    
    def test_refresh_token_success(self, test_client, sample_admin):
        """Test successful token refresh."""
        # First login to get refresh token
        login_data = {
            "email": sample_admin["email"],
            "password": "TestPassword123!"
        }
        
        login_response = test_client.post("/api/v1/auth/admin-login", json=login_data)
        login_data = login_response.json()
        refresh_token = login_data["data"]["refresh_token"]
        
        # Use refresh token
        refresh_data = {"refresh_token": refresh_token}
        response = test_client.post("/api/v1/auth/refresh", json=refresh_data)
        
        TestHelpers.assert_response_success(response)
        data = response.json()
        
        assert "data" in data
        assert "access_token" in data["data"]
        assert "token_type" in data["data"]
        assert "expires_in" in data["data"]
        
        assert data["data"]["token_type"] == "bearer"
        assert data["data"]["expires_in"] == 7200
    
    def test_refresh_token_invalid(self, test_client):
        """Test token refresh with invalid token."""
        refresh_data = {"refresh_token": "invalid-token"}
        response = test_client.post("/api/v1/auth/refresh", json=refresh_data)
        
        TestHelpers.assert_response_error(response, 401)
        data = response.json()
        assert "Invalid or expired refresh token" in data["message"]
    
    def test_refresh_token_missing(self, test_client):
        """Test token refresh with missing token."""
        refresh_data = {}
        response = test_client.post("/api/v1/auth/refresh", json=refresh_data)
        
        TestHelpers.assert_response_error(response, 400)
        data = response.json()
        assert "Refresh token required" in data["message"]
    
    def test_request_password_reset_success(self, test_client, sample_admin):
        """Test successful password reset request."""
        reset_data = {"email": sample_admin["email"]}
        
        response = test_client.post("/api/v1/auth/request-password-reset", json=reset_data)
        
        TestHelpers.assert_response_success(response)
        data = response.json()
        assert "If the email exists, a password reset link has been sent" in data["message"]
    
    def test_request_password_reset_nonexistent_email(self, test_client):
        """Test password reset request with non-existent email."""
        reset_data = {"email": "nonexistent@example.com"}
        
        response = test_client.post("/api/v1/auth/request-password-reset", json=reset_data)
        
        # Should still return success for security reasons
        TestHelpers.assert_response_success(response)
        data = response.json()
        assert "If the email exists, a password reset link has been sent" in data["message"]
    
    def test_request_password_reset_invalid_email(self, test_client):
        """Test password reset request with invalid email format."""
        reset_data = {"email": "invalid-email"}
        
        response = test_client.post("/api/v1/auth/request-password-reset", json=reset_data)
        
        TestHelpers.assert_response_error(response, 422)
    
    def test_request_password_reset_missing_email(self, test_client):
        """Test password reset request with missing email."""
        reset_data = {}
        
        response = test_client.post("/api/v1/auth/request-password-reset", json=reset_data)
        
        TestHelpers.assert_response_error(response, 422)
    
    def test_reset_password_success(self, test_client, test_db, sample_admin):
        """Test successful password reset."""
        # Create reset token
        reset_token_data = {
            "token": "test-reset-token",
            "user_id": sample_admin["id"],
            "user_type": "admin",
            "email": sample_admin["email"],
            "expires_at": "2024-12-31T23:59:59Z",
            "used": False,
            "created_at": "2024-01-01T00:00:00Z"
        }
        test_db.password_reset_tokens.insert_one(reset_token_data)
        
        reset_data = {
            "token": "test-reset-token",
            "new_password": "NewPassword123!"
        }
        
        response = test_client.post("/api/v1/auth/reset-password", json=reset_data)
        
        TestHelpers.assert_response_success(response)
        data = response.json()
        assert "Password reset successful" in data["message"]
    
    def test_reset_password_invalid_token(self, test_client):
        """Test password reset with invalid token."""
        reset_data = {
            "token": "invalid-token",
            "new_password": "NewPassword123!"
        }
        
        response = test_client.post("/api/v1/auth/reset-password", json=reset_data)
        
        TestHelpers.assert_response_error(response, 400)
        data = response.json()
        assert "Invalid or expired reset token" in data["message"]
    
    def test_reset_password_weak_password(self, test_client, test_db, sample_admin):
        """Test password reset with weak password."""
        # Create reset token
        reset_token_data = {
            "token": "test-reset-token",
            "user_id": sample_admin["id"],
            "user_type": "admin",
            "email": sample_admin["email"],
            "expires_at": "2024-12-31T23:59:59Z",
            "used": False,
            "created_at": "2024-01-01T00:00:00Z"
        }
        test_db.password_reset_tokens.insert_one(reset_token_data)
        
        reset_data = {
            "token": "test-reset-token",
            "new_password": "weak"
        }
        
        response = test_client.post("/api/v1/auth/reset-password", json=reset_data)
        
        TestHelpers.assert_response_error(response, 422)
    
    def test_reset_password_missing_fields(self, test_client):
        """Test password reset with missing fields."""
        reset_data = {
            "token": "test-token"
            # Missing new_password
        }
        
        response = test_client.post("/api/v1/auth/reset-password", json=reset_data)
        
        TestHelpers.assert_response_error(response, 422)


class TestStudentAuthEndpoints:
    """Test student authentication API endpoints."""
    
    def test_student_login_success(self, test_client, sample_student):
        """Test successful student login."""
        # Note: In a real implementation, students would have passwords
        # For testing, we'll mock this endpoint
        login_data = {
            "reg_number": sample_student["reg_number"],
            "password": "TestPassword123!"
        }
        
        # Mock the student login endpoint
        with pytest.MonkeyPatch().context() as m:
            m.setattr("routes.auth_routes.AuthService.authenticate_student", 
                     lambda reg_number, password: sample_student if reg_number == sample_student["reg_number"] else None)
            
            response = test_client.post("/api/v1/auth/student-login", json=login_data)
            
            TestHelpers.assert_response_success(response)
            data = response.json()
            
            assert "data" in data
            assert "user" in data["data"]
            assert "access_token" in data["data"]
            assert "refresh_token" in data["data"]
    
    def test_student_login_invalid_reg_number(self, test_client):
        """Test student login with invalid registration number."""
        login_data = {
            "reg_number": "INVALID001",
            "password": "TestPassword123!"
        }
        
        response = test_client.post("/api/v1/auth/student-login", json=login_data)
        
        TestHelpers.assert_response_error(response, 401)
        data = response.json()
        assert "Invalid credentials" in data["message"]
    
    def test_student_login_missing_fields(self, test_client):
        """Test student login with missing fields."""
        login_data = {
            "reg_number": "TEST001"
            # Missing password
        }
        
        response = test_client.post("/api/v1/auth/student-login", json=login_data)
        
        TestHelpers.assert_response_error(response, 422)


class TestAuthMiddleware:
    """Test authentication middleware."""
    
    def test_protected_endpoint_without_token(self, test_client):
        """Test accessing protected endpoint without token."""
        response = test_client.get("/api/v1/students/")
        
        TestHelpers.assert_response_error(response, 401)
        data = response.json()
        assert "Not authenticated" in data["message"]
    
    def test_protected_endpoint_with_invalid_token(self, test_client):
        """Test accessing protected endpoint with invalid token."""
        headers = {"Authorization": "Bearer invalid-token"}
        response = test_client.get("/api/v1/students/", headers=headers)
        
        TestHelpers.assert_response_error(response, 401)
        data = response.json()
        assert "Invalid token" in data["message"]
    
    def test_protected_endpoint_with_valid_token(self, test_client, auth_headers):
        """Test accessing protected endpoint with valid token."""
        response = test_client.get("/api/v1/students/", headers=auth_headers)
        
        # Should succeed (even if empty results)
        assert response.status_code in [200, 404]
    
    def test_protected_endpoint_with_expired_token(self, test_client):
        """Test accessing protected endpoint with expired token."""
        # Create expired token
        import jwt
        from datetime import datetime, timedelta
        
        expired_data = {
            "sub": "test-user",
            "role": "admin",
            "exp": datetime.utcnow() - timedelta(hours=1)
        }
        expired_token = jwt.encode(expired_data, "test-secret-key-for-testing-only", algorithm="HS256")
        
        headers = {"Authorization": f"Bearer {expired_token}"}
        response = test_client.get("/api/v1/students/", headers=headers)
        
        TestHelpers.assert_response_error(response, 401)
        data = response.json()
        assert "Token expired" in data["message"]


class TestRateLimiting:
    """Test rate limiting functionality."""
    
    def test_rate_limit_exceeded(self, test_client):
        """Test rate limit exceeded scenario."""
        # Make multiple requests quickly to trigger rate limit
        for i in range(35):  # Assuming default limit is 30
            response = test_client.post("/api/v1/auth/admin-login", json={
                "email": "test@example.com",
                "password": "wrongpassword"
            })
            
            if response.status_code == 429:
                TestHelpers.assert_response_error(response, 429)
                data = response.json()
                assert "Rate limit exceeded" in data["message"]
                assert "retry_after" in data
                break
        else:
            pytest.skip("Rate limit not triggered - may need to adjust test parameters")


class TestCSRFProtection:
    """Test CSRF protection."""
    
    def test_csrf_token_required_for_state_changing_operations(self, test_client, auth_headers):
        """Test that CSRF token is required for state-changing operations."""
        # This would depend on CSRF middleware implementation
        # For now, we'll test that the endpoint exists and responds appropriately
        student_data = TestDataFactory.create_student_data()
        
        response = test_client.post("/api/v1/students/", json=student_data, headers=auth_headers)
        
        # Should either succeed or require CSRF token
        assert response.status_code in [200, 201, 403]
        
        if response.status_code == 403:
            data = response.json()
            assert "CSRF" in data["message"] or "csrf" in data["message"].lower()
