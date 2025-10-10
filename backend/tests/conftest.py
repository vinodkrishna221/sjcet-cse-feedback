"""
Backend testing configuration and utilities
"""
import pytest
import asyncio
import os
import sys
from typing import AsyncGenerator, Generator
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
import tempfile
import shutil
from datetime import datetime, timedelta
import json

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from server import app
from database import DatabaseOperations
from auth import AuthService
from models import Student, Faculty, Admin, FeedbackSubmission

# Test configuration
TEST_DATABASE_URL = "mongodb://localhost:27017/test_feedback_system"
TEST_SECRET_KEY = "test-secret-key-for-testing-only"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def test_db():
    """Create a test database connection."""
    client = AsyncIOMotorClient(TEST_DATABASE_URL)
    db = client.test_feedback_system
    
    # Clean up before tests
    await db.drop_collection("students")
    await db.drop_collection("faculty")
    await db.drop_collection("admins")
    await db.drop_collection("feedback_submissions")
    await db.drop_collection("password_reset_tokens")
    await db.drop_collection("feedback_drafts")
    
    yield db
    
    # Clean up after tests
    await client.drop_database("test_feedback_system")
    client.close()

@pytest.fixture
def test_client():
    """Create a test client for FastAPI."""
    with patch.dict(os.environ, {
        "DATABASE_URL": TEST_DATABASE_URL,
        "SECRET_KEY": TEST_SECRET_KEY,
        "JWT_SECRET_KEY": TEST_SECRET_KEY,
        "JWT_ALGORITHM": "HS256",
        "JWT_ACCESS_TOKEN_EXPIRE_MINUTES": "30",
        "JWT_REFRESH_TOKEN_EXPIRE_DAYS": "7"
    }):
        with TestClient(app) as client:
            yield client

@pytest.fixture
async def sample_student(test_db):
    """Create a sample student for testing."""
    student_data = {
        "id": "test-student-1",
        "name": "Test Student",
        "reg_number": "TEST001",
        "section": "A",
        "department": "CSE",
        "batch_year": "2023",
        "email": "test.student@college.edu",
        "phone": "1234567890",
        "address": "Test Address",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_active": True,
        "deleted_at": None
    }
    
    await test_db.students.insert_one(student_data)
    yield student_data
    await test_db.students.delete_one({"id": "test-student-1"})

@pytest.fixture
async def sample_faculty(test_db):
    """Create a sample faculty for testing."""
    faculty_data = {
        "id": "test-faculty-1",
        "name": "Test Faculty",
        "employee_id": "FAC001",
        "department": "CSE",
        "subjects": ["Data Structures", "Algorithms"],
        "email": "test.faculty@college.edu",
        "phone": "1234567890",
        "qualification": "Ph.D. Computer Science",
        "experience": 5,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_active": True,
        "deleted_at": None
    }
    
    await test_db.faculty.insert_one(faculty_data)
    yield faculty_data
    await test_db.faculty.delete_one({"id": "test-faculty-1"})

@pytest.fixture
async def sample_admin(test_db):
    """Create a sample admin for testing."""
    admin_data = {
        "id": "test-admin-1",
        "name": "Test Admin",
        "email": "test.admin@college.edu",
        "role": "hod",
        "department": "CSE",
        "phone": "1234567890",
        "password_hash": AuthService.hash_password("TestPassword123!"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_active": True,
        "deleted_at": None
    }
    
    await test_db.admins.insert_one(admin_data)
    yield admin_data
    await test_db.admins.delete_one({"id": "test-admin-1"})

@pytest.fixture
async def sample_feedback(test_db, sample_student, sample_faculty):
    """Create a sample feedback submission for testing."""
    feedback_data = {
        "id": "test-feedback-1",
        "student_id": sample_student["id"],
        "student_section": sample_student["section"],
        "semester": "1",
        "academic_year": "2023-24",
        "faculty_feedbacks": [
            {
                "faculty_id": sample_faculty["id"],
                "faculty_name": sample_faculty["name"],
                "subject": "Data Structures",
                "question_ratings": [
                    {
                        "question_id": "q1",
                        "question": "Teaching Quality",
                        "rating": 8,
                        "weight": 25
                    },
                    {
                        "question_id": "q2",
                        "question": "Communication",
                        "rating": 9,
                        "weight": 25
                    }
                ],
                "overall_rating": 8,
                "weighted_score": 85.0,
                "grade_interpretation": "Good",
                "detailed_feedback": "Good teaching",
                "suggestions": "Keep it up"
            }
        ],
        "is_anonymous": True,
        "submitted_at": datetime.utcnow(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_active": True,
        "deleted_at": None
    }
    
    await test_db.feedback_submissions.insert_one(feedback_data)
    yield feedback_data
    await test_db.feedback_submissions.delete_one({"id": "test-feedback-1"})

@pytest.fixture
def auth_headers(test_client, sample_admin):
    """Create authentication headers for testing."""
    login_data = {
        "email": sample_admin["email"],
        "password": "TestPassword123!"
    }
    
    response = test_client.post("/api/v1/auth/admin-login", json=login_data)
    assert response.status_code == 200
    
    token = response.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def student_auth_headers(test_client, sample_student):
    """Create student authentication headers for testing."""
    # In a real implementation, you'd have student login
    # For testing, we'll mock this
    token = AuthService.create_access_token({
        "sub": sample_student["id"],
        "role": "student"
    })
    return {"Authorization": f"Bearer {token}"}

class TestDataFactory:
    """Factory class for creating test data."""
    
    @staticmethod
    def create_student_data(overrides=None):
        """Create student test data with optional overrides."""
        data = {
            "name": "Test Student",
            "reg_number": "TEST001",
            "section": "A",
            "department": "CSE",
            "batch_year": "2023",
            "email": "test.student@college.edu",
            "phone": "1234567890",
            "address": "Test Address"
        }
        if overrides:
            data.update(overrides)
        return data
    
    @staticmethod
    def create_faculty_data(overrides=None):
        """Create faculty test data with optional overrides."""
        data = {
            "name": "Test Faculty",
            "employee_id": "FAC001",
            "department": "CSE",
            "subjects": ["Data Structures", "Algorithms"],
            "email": "test.faculty@college.edu",
            "phone": "1234567890",
            "qualification": "Ph.D. Computer Science",
            "experience": 5
        }
        if overrides:
            data.update(overrides)
        return data
    
    @staticmethod
    def create_admin_data(overrides=None):
        """Create admin test data with optional overrides."""
        data = {
            "name": "Test Admin",
            "email": "test.admin@college.edu",
            "role": "hod",
            "department": "CSE",
            "phone": "1234567890",
            "password": "TestPassword123!"
        }
        if overrides:
            data.update(overrides)
        return data
    
    @staticmethod
    def create_feedback_data(student_id, faculty_id, overrides=None):
        """Create feedback test data with optional overrides."""
        data = {
            "student_section": "A",
            "semester": "1",
            "academic_year": "2023-24",
            "faculty_feedbacks": [
                {
                    "faculty_id": faculty_id,
                    "faculty_name": "Test Faculty",
                    "subject": "Data Structures",
                    "question_ratings": [
                        {
                            "question_id": "q1",
                            "question": "Teaching Quality",
                            "rating": 8,
                            "weight": 25
                        }
                    ],
                    "overall_rating": 8,
                    "weighted_score": 80.0,
                    "grade_interpretation": "Good",
                    "detailed_feedback": "Good teaching",
                    "suggestions": "Keep it up"
                }
            ],
            "is_anonymous": True
        }
        if overrides:
            data.update(overrides)
        return data

class MockEmailService:
    """Mock email service for testing."""
    
    def __init__(self):
        self.sent_emails = []
    
    async def send_email(self, to, subject, body):
        """Mock send email method."""
        self.sent_emails.append({
            "to": to,
            "subject": subject,
            "body": body,
            "sent_at": datetime.utcnow()
        })
        return True
    
    def get_sent_emails(self):
        """Get all sent emails."""
        return self.sent_emails
    
    def clear_emails(self):
        """Clear sent emails."""
        self.sent_emails = []

@pytest.fixture
def mock_email_service():
    """Create a mock email service."""
    return MockEmailService()

class TestHelpers:
    """Helper methods for testing."""
    
    @staticmethod
    def assert_response_success(response, expected_status=200):
        """Assert that a response is successful."""
        assert response.status_code == expected_status
        data = response.json()
        assert data["success"] is True
        return data
    
    @staticmethod
    def assert_response_error(response, expected_status=400):
        """Assert that a response is an error."""
        assert response.status_code == expected_status
        data = response.json()
        assert data["success"] is False
        return data
    
    @staticmethod
    def assert_paginated_response(response, expected_count=None):
        """Assert that a response is paginated."""
        data = response.json()
        assert "data" in data
        assert "pagination" in data["data"]
        pagination = data["data"]["pagination"]
        assert "page" in pagination
        assert "limit" in pagination
        assert "total" in pagination
        assert "pages" in pagination
        
        if expected_count is not None:
            assert pagination["total"] == expected_count
        
        return data
    
    @staticmethod
    def assert_validation_error(response, field_name):
        """Assert that a response contains a validation error for a specific field."""
        data = response.json()
        assert data["success"] is False
        assert "errors" in data
        errors = data["errors"]
        assert any(field_name in error for error in errors)
        return data

# Pytest configuration
def pytest_configure(config):
    """Configure pytest."""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "api: mark test as an API test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )

# Test data cleanup
@pytest.fixture(autouse=True)
async def cleanup_test_data(test_db):
    """Automatically cleanup test data after each test."""
    yield
    # Clean up any test data that might have been created
    collections = ["students", "faculty", "admins", "feedback_submissions", "password_reset_tokens", "feedback_drafts"]
    for collection_name in collections:
        await test_db[collection_name].delete_many({"id": {"$regex": "^test-"}})

# Performance testing utilities
class PerformanceTestHelper:
    """Helper for performance testing."""
    
    @staticmethod
    async def measure_time(func, *args, **kwargs):
        """Measure the execution time of a function."""
        start_time = datetime.utcnow()
        result = await func(*args, **kwargs)
        end_time = datetime.utcnow()
        execution_time = (end_time - start_time).total_seconds()
        return result, execution_time
    
    @staticmethod
    def assert_performance(execution_time, max_time):
        """Assert that execution time is within acceptable limits."""
        assert execution_time <= max_time, f"Execution time {execution_time}s exceeded maximum {max_time}s"

# Database testing utilities
class DatabaseTestHelper:
    """Helper for database testing."""
    
    @staticmethod
    async def assert_document_exists(db, collection, filter_dict):
        """Assert that a document exists in the database."""
        document = await db[collection].find_one(filter_dict)
        assert document is not None, f"Document not found in {collection} with filter {filter_dict}"
        return document
    
    @staticmethod
    async def assert_document_not_exists(db, collection, filter_dict):
        """Assert that a document does not exist in the database."""
        document = await db[collection].find_one(filter_dict)
        assert document is None, f"Document found in {collection} with filter {filter_dict}"
    
    @staticmethod
    async def count_documents(db, collection, filter_dict=None):
        """Count documents in a collection."""
        if filter_dict is None:
            filter_dict = {}
        return await db[collection].count_documents(filter_dict)
    
    @staticmethod
    async def get_all_documents(db, collection, filter_dict=None):
        """Get all documents from a collection."""
        if filter_dict is None:
            filter_dict = {}
        cursor = db[collection].find(filter_dict)
        return await cursor.to_list(length=None)
