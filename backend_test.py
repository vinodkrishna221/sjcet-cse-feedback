#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Student Feedback Management System
Tests all API endpoints with proper authentication and error handling
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "http://localhost:8001/api"
HEADERS = {"Content-Type": "application/json"}

class BackendTester:
    def __init__(self):
        self.admin_token = None
        self.student_token = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, message: str, details: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    token: str = None, params: Dict = None) -> tuple:
        """Make HTTP request with proper error handling"""
        url = f"{BASE_URL}{endpoint}"
        headers = HEADERS.copy()
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params=params, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=10)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return response.status_code < 400, {
                "status_code": response.status_code,
                "data": response_data
            }
            
        except requests.exceptions.ConnectionError:
            return False, {"error": "Connection refused - Backend server not running"}
        except requests.exceptions.Timeout:
            return False, {"error": "Request timeout"}
        except Exception as e:
            return False, {"error": str(e)}
    
    def test_health_check(self):
        """Test health check endpoints"""
        print("\n=== TESTING HEALTH CHECK ===")
        
        # Test root endpoint
        success, response = self.make_request("GET", "/")
        self.log_test(
            "Health Check - Root Endpoint",
            success and response.get("data", {}).get("status") == "healthy",
            "Root endpoint accessible" if success else f"Failed: {response}",
            response
        )
        
        # Test health endpoint
        success, response = self.make_request("GET", "/health")
        self.log_test(
            "Health Check - Health Endpoint", 
            success and response.get("data", {}).get("status") == "healthy",
            "Health endpoint accessible" if success else f"Failed: {response}",
            response
        )
    
    def test_admin_authentication(self):
        """Test admin authentication (HOD and Principal)"""
        print("\n=== TESTING ADMIN AUTHENTICATION ===")
        
        # Test HOD login
        hod_credentials = {
            "username": "hod_cse",
            "password": "hod@123"
        }
        
        success, response = self.make_request("POST", "/auth/admin/login", hod_credentials)
        if success and response.get("data", {}).get("data", {}).get("access_token"):
            self.admin_token = response["data"]["data"]["access_token"]
            user_data = response["data"]["data"].get("user", {})
            self.log_test(
                "Admin Authentication - HOD Login",
                True,
                f"HOD login successful - Role: {user_data.get('role')}",
                {"user": user_data}
            )
        else:
            self.log_test(
                "Admin Authentication - HOD Login",
                False,
                "HOD login failed",
                response
            )
        
        # Test Principal login
        principal_credentials = {
            "username": "principal", 
            "password": "principal@123"
        }
        
        success, response = self.make_request("POST", "/auth/admin/login", principal_credentials)
        self.log_test(
            "Admin Authentication - Principal Login",
            success and response.get("data", {}).get("data", {}).get("access_token") is not None,
            "Principal login successful" if success else "Principal login failed",
            response.get("data", {}).get("data", {}).get("user") if success else response
        )
        
        # Test invalid credentials
        invalid_credentials = {
            "username": "invalid_user",
            "password": "wrong_password"
        }
        
        success, response = self.make_request("POST", "/auth/admin/login", invalid_credentials)
        self.log_test(
            "Admin Authentication - Invalid Credentials",
            not success or response.get("status_code") == 401,
            "Invalid credentials properly rejected" if not success or response.get("status_code") == 401 else "Security issue: invalid credentials accepted",
            response
        )
    
    def test_student_authentication(self):
        """Test student authentication"""
        print("\n=== TESTING STUDENT AUTHENTICATION ===")
        
        # First, we need to create test students since they might not exist
        if self.admin_token:
            # Create test students
            test_students = [
                {
                    "reg_number": "24G31A0501",
                    "name": "Test Student A",
                    "section": "A",
                    "dob": "2003-05-15",
                    "email": "student.a@test.edu"
                },
                {
                    "reg_number": "24G31A0521", 
                    "name": "Test Student B",
                    "section": "A",
                    "dob": "2003-01-07",
                    "email": "student.b@test.edu"
                }
            ]
            
            for student in test_students:
                success, response = self.make_request("POST", "/students/", student, self.admin_token)
                # Don't fail if student already exists
                if not success and "already exists" not in str(response):
                    print(f"   Warning: Could not create test student {student['reg_number']}: {response}")
        
        # Test Student A login
        student_a_credentials = {
            "reg_number": "24G31A0501",
            "dob": "2003-05-15"
        }
        
        success, response = self.make_request("POST", "/auth/student/login", student_a_credentials)
        if success and response.get("data", {}).get("data", {}).get("access_token"):
            self.student_token = response["data"]["data"]["access_token"]
            user_data = response["data"]["data"].get("user", {})
            self.log_test(
                "Student Authentication - Student A Login",
                True,
                f"Student A login successful - Section: {user_data.get('section')}",
                {"user": user_data}
            )
        else:
            self.log_test(
                "Student Authentication - Student A Login",
                False,
                "Student A login failed",
                response
            )
        
        # Test Student B login
        student_b_credentials = {
            "reg_number": "24G31A0521",
            "dob": "2003-01-07"
        }
        
        success, response = self.make_request("POST", "/auth/student/login", student_b_credentials)
        self.log_test(
            "Student Authentication - Student B Login",
            success and response.get("data", {}).get("data", {}).get("access_token") is not None,
            "Student B login successful" if success else "Student B login failed",
            response.get("data", {}).get("data", {}).get("user") if success else response
        )
        
        # Test invalid student credentials
        invalid_student = {
            "reg_number": "INVALID123",
            "dob": "2000-01-01"
        }
        
        success, response = self.make_request("POST", "/auth/student/login", invalid_student)
        self.log_test(
            "Student Authentication - Invalid Credentials",
            not success or response.get("status_code") == 401,
            "Invalid student credentials properly rejected" if not success or response.get("status_code") == 401 else "Security issue: invalid credentials accepted",
            response
        )
    
    def test_jwt_token_verification(self):
        """Test JWT token verification"""
        print("\n=== TESTING JWT TOKEN VERIFICATION ===")
        
        # Test valid admin token
        if self.admin_token:
            success, response = self.make_request("POST", "/auth/verify-token", token=self.admin_token)
            self.log_test(
                "JWT Verification - Valid Admin Token",
                success and response.get("data", {}).get("data", {}).get("user") is not None,
                "Admin token verification successful" if success else "Admin token verification failed",
                response.get("data", {}).get("data", {}).get("user") if success else response
            )
        
        # Test valid student token
        if self.student_token:
            success, response = self.make_request("POST", "/auth/verify-token", token=self.student_token)
            self.log_test(
                "JWT Verification - Valid Student Token",
                success and response.get("data", {}).get("data", {}).get("user") is not None,
                "Student token verification successful" if success else "Student token verification failed",
                response.get("data", {}).get("data", {}).get("user") if success else response
            )
        
        # Test invalid token
        success, response = self.make_request("POST", "/auth/verify-token", token="invalid_token_123")
        self.log_test(
            "JWT Verification - Invalid Token",
            not success or response.get("status_code") == 401,
            "Invalid token properly rejected" if not success or response.get("status_code") == 401 else "Security issue: invalid token accepted",
            response
        )
        
        # Test no token
        success, response = self.make_request("POST", "/auth/verify-token")
        self.log_test(
            "JWT Verification - No Token",
            not success or response.get("status_code") == 401,
            "Missing token properly rejected" if not success or response.get("status_code") == 401 else "Security issue: missing token accepted",
            response
        )
    
    def test_student_management(self):
        """Test student management CRUD operations"""
        print("\n=== TESTING STUDENT MANAGEMENT ===")
        
        if not self.admin_token:
            self.log_test("Student Management", False, "No admin token available for testing", None)
            return
        
        # Test get all students
        success, response = self.make_request("GET", "/students/", token=self.admin_token)
        students_data = response.get("data", {}).get("data", {}) if success else {}
        self.log_test(
            "Student Management - Get All Students",
            success and "students" in students_data,
            f"Retrieved {len(students_data.get('students', []))} students" if success else "Failed to retrieve students",
            {"count": len(students_data.get("students", []))} if success else response
        )
        
        # Test get students by section
        success, response = self.make_request("GET", "/students/", params={"section": "A"}, token=self.admin_token)
        students_data = response.get("data", {}).get("data", {}) if success else {}
        self.log_test(
            "Student Management - Get Students by Section A",
            success and "students" in students_data,
            f"Retrieved {len(students_data.get('students', []))} students from section A" if success else "Failed to retrieve section A students",
            {"count": len(students_data.get("students", []))} if success else response
        )
        
        # Test get section summary
        success, response = self.make_request("GET", "/students/sections/summary", token=self.admin_token)
        summary_data = response.get("data", {}).get("data", {}) if success else {}
        self.log_test(
            "Student Management - Section Summary",
            success and "total_students" in summary_data,
            f"Section summary: {summary_data.get('total_students', 0)} total students" if success else "Failed to get section summary",
            summary_data if success else response
        )
        
        # Test unauthorized access (student trying to access admin endpoint)
        if self.student_token:
            success, response = self.make_request("GET", "/students/", token=self.student_token)
            self.log_test(
                "Student Management - Unauthorized Access",
                not success or response.get("status_code") == 403,
                "Student properly denied access to admin endpoint" if not success or response.get("status_code") == 403 else "Security issue: student can access admin endpoint",
                response
            )
    
    def test_faculty_management(self):
        """Test faculty management CRUD operations"""
        print("\n=== TESTING FACULTY MANAGEMENT ===")
        
        if not self.admin_token:
            self.log_test("Faculty Management", False, "No admin token available for testing", None)
            return
        
        # First create some test faculty if they don't exist
        test_faculty = [
            {
                "faculty_id": "FAC001",
                "name": "Dr. Test Faculty 1",
                "subjects": ["Mathematics", "Statistics"],
                "sections": ["A", "B"],
                "department": "CSE",
                "designation": "Professor"
            },
            {
                "faculty_id": "FAC002", 
                "name": "Dr. Test Faculty 2",
                "subjects": ["Physics", "Chemistry"],
                "sections": ["A"],
                "department": "Science",
                "designation": "Associate Professor"
            }
        ]
        
        for faculty in test_faculty:
            success, response = self.make_request("POST", "/faculty/", faculty, self.admin_token)
            # Don't fail if faculty already exists
            if not success and "already exists" not in str(response):
                print(f"   Warning: Could not create test faculty {faculty['faculty_id']}: {response}")
        
        # Test get all faculty
        success, response = self.make_request("GET", "/faculty/", token=self.admin_token)
        self.log_test(
            "Faculty Management - Get All Faculty",
            success and "faculty" in response.get("data", {}),
            f"Retrieved {len(response.get('data', {}).get('faculty', []))} faculty members" if success else "Failed to retrieve faculty",
            {"count": len(response.get("data", {}).get("faculty", []))} if success else response
        )
        
        # Test get faculty by section
        success, response = self.make_request("GET", "/faculty/by-section/A", token=self.admin_token)
        self.log_test(
            "Faculty Management - Get Faculty by Section A",
            success and "faculty" in response.get("data", {}),
            f"Retrieved {len(response.get('data', {}).get('faculty', []))} faculty for section A" if success else "Failed to retrieve faculty for section A",
            {"count": len(response.get("data", {}).get("faculty", []))} if success else response
        )
        
        # Test get subjects list
        success, response = self.make_request("GET", "/faculty/subjects/list", token=self.admin_token)
        self.log_test(
            "Faculty Management - Get Subjects List",
            success and "subjects" in response.get("data", {}),
            f"Retrieved {len(response.get('data', {}).get('subjects', []))} subjects" if success else "Failed to retrieve subjects",
            {"subjects": response.get("data", {}).get("subjects", [])} if success else response
        )
    
    def test_feedback_system(self):
        """Test feedback system endpoints"""
        print("\n=== TESTING FEEDBACK SYSTEM ===")
        
        # Test get feedback questions (public endpoint)
        success, response = self.make_request("GET", "/feedback/questions")
        questions_data = response.get("data", {}).get("data", {}) if success else {}
        self.log_test(
            "Feedback System - Get Questions",
            success and "questions" in questions_data,
            f"Retrieved {len(questions_data.get('questions', []))} feedback questions" if success else "Failed to retrieve feedback questions",
            {"count": len(questions_data.get("questions", []))} if success else response
        )
        
        # Test dashboard analytics (admin only)
        if self.admin_token:
            success, response = self.make_request("GET", "/feedback/analytics/dashboard", token=self.admin_token)
            self.log_test(
                "Feedback System - Dashboard Analytics",
                success and "total_students" in response.get("data", {}),
                "Dashboard analytics retrieved successfully" if success else "Failed to retrieve dashboard analytics",
                {
                    "total_students": response.get("data", {}).get("total_students", 0),
                    "total_faculty": response.get("data", {}).get("total_faculty", 0),
                    "total_feedback_submissions": response.get("data", {}).get("total_feedback_submissions", 0)
                } if success else response
            )
        
        # Test unauthorized access to analytics
        if self.student_token:
            success, response = self.make_request("GET", "/feedback/analytics/dashboard", token=self.student_token)
            self.log_test(
                "Feedback System - Unauthorized Analytics Access",
                not success or response.get("status_code") == 403,
                "Student properly denied access to analytics" if not success or response.get("status_code") == 403 else "Security issue: student can access analytics",
                response
            )
    
    def test_role_based_access_control(self):
        """Test role-based access control"""
        print("\n=== TESTING ROLE-BASED ACCESS CONTROL ===")
        
        # Test admin endpoints with student token
        admin_endpoints = [
            "/students/",
            "/faculty/",
            "/feedback/analytics/dashboard"
        ]
        
        if self.student_token:
            for endpoint in admin_endpoints:
                success, response = self.make_request("GET", endpoint, token=self.student_token)
                self.log_test(
                    f"RBAC - Student Access to {endpoint}",
                    not success or response.get("status_code") == 403,
                    f"Student properly denied access to {endpoint}" if not success or response.get("status_code") == 403 else f"Security issue: student can access {endpoint}",
                    response
                )
        
        # Test endpoints without authentication
        protected_endpoints = [
            "/students/",
            "/faculty/", 
            "/feedback/analytics/dashboard"
        ]
        
        for endpoint in protected_endpoints:
            success, response = self.make_request("GET", endpoint)
            self.log_test(
                f"RBAC - Unauthenticated Access to {endpoint}",
                not success or response.get("status_code") in [401, 403],
                f"Unauthenticated access properly denied to {endpoint}" if not success or response.get("status_code") in [401, 403] else f"Security issue: unauthenticated access allowed to {endpoint}",
                response
            )
    
    def test_database_operations(self):
        """Test database operations and data persistence"""
        print("\n=== TESTING DATABASE OPERATIONS ===")
        
        if not self.admin_token:
            self.log_test("Database Operations", False, "No admin token available for testing", None)
            return
        
        # Test data persistence by creating and retrieving a student
        test_student = {
            "reg_number": "TEST001",
            "name": "Database Test Student",
            "section": "A",
            "dob": "2003-06-15",
            "email": "dbtest@test.edu"
        }
        
        # Create student
        success, response = self.make_request("POST", "/students/", test_student, self.admin_token)
        if success or "already exists" in str(response):
            # Try to retrieve the student
            success, response = self.make_request("GET", "/students/", params={"section": "A"}, token=self.admin_token)
            if success:
                students = response.get("data", {}).get("students", [])
                test_student_found = any(s.get("reg_number") == "TEST001" for s in students)
                self.log_test(
                    "Database Operations - Data Persistence",
                    test_student_found,
                    "Student data persisted and retrieved successfully" if test_student_found else "Student data not found after creation",
                    {"students_count": len(students)}
                )
            else:
                self.log_test(
                    "Database Operations - Data Retrieval",
                    False,
                    "Failed to retrieve students for persistence test",
                    response
                )
        else:
            self.log_test(
                "Database Operations - Data Creation",
                False,
                "Failed to create test student",
                response
            )
        
        # Test aggregation operations (section summary)
        success, response = self.make_request("GET", "/students/sections/summary", token=self.admin_token)
        self.log_test(
            "Database Operations - Aggregation",
            success and isinstance(response.get("data", {}).get("total_students"), int),
            "Database aggregation operations working" if success else "Database aggregation failed",
            response.get("data") if success else response
        )
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Comprehensive Backend Testing")
        print("=" * 60)
        
        # Run tests in order
        self.test_health_check()
        self.test_admin_authentication()
        self.test_student_authentication()
        self.test_jwt_token_verification()
        self.test_student_management()
        self.test_faculty_management()
        self.test_feedback_system()
        self.test_role_based_access_control()
        self.test_database_operations()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        print("\n" + "=" * 60)
        return failed_tests == 0

def main():
    """Main function to run tests"""
    tester = BackendTester()
    
    try:
        success = tester.run_all_tests()
        
        # Save detailed results to file
        with open("/app/test_results_detailed.json", "w") as f:
            json.dump(tester.test_results, f, indent=2, default=str)
        
        print(f"\n📝 Detailed results saved to: /app/test_results_detailed.json")
        
        # Exit with appropriate code
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n💥 Unexpected error during testing: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()