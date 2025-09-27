#!/usr/bin/env python3
"""
Fixed Backend Testing for Student Feedback Management System
Tests all API endpoints with correct response parsing
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
                "response": response_data
            }
            
        except requests.exceptions.ConnectionError:
            return False, {"error": "Connection refused - Backend server not running"}
        except requests.exceptions.Timeout:
            return False, {"error": "Request timeout"}
        except Exception as e:
            return False, {"error": str(e)}
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Comprehensive Backend Testing")
        print("=" * 60)
        
        # Test 1: Health Check
        print("\n=== TESTING HEALTH CHECK ===")
        success, response = self.make_request("GET", "/health")
        api_response = response.get("response", {})
        self.log_test(
            "Health Check",
            success and api_response.get("status") == "healthy",
            "Health endpoint accessible" if success else f"Failed: {response}",
            api_response
        )
        
        # Test 2: Admin Authentication - HOD
        print("\n=== TESTING ADMIN AUTHENTICATION ===")
        hod_credentials = {"username": "hod_cse", "password": "hod@123"}
        success, response = self.make_request("POST", "/auth/admin/login", hod_credentials)
        api_response = response.get("response", {})
        
        if success and api_response.get("success") and api_response.get("data", {}).get("access_token"):
            self.admin_token = api_response["data"]["access_token"]
            user_data = api_response["data"].get("user", {})
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
                api_response
            )
        
        # Test 3: Admin Authentication - Principal
        principal_credentials = {"username": "principal", "password": "principal@123"}
        success, response = self.make_request("POST", "/auth/admin/login", principal_credentials)
        api_response = response.get("response", {})
        self.log_test(
            "Admin Authentication - Principal Login",
            success and api_response.get("success") and api_response.get("data", {}).get("access_token") is not None,
            "Principal login successful" if success else "Principal login failed",
            api_response.get("data", {}).get("user") if success else api_response
        )
        
        # Test 4: Student Authentication - Student A
        print("\n=== TESTING STUDENT AUTHENTICATION ===")
        student_a_credentials = {"reg_number": "24G31A0501", "dob": "2003-05-15"}
        success, response = self.make_request("POST", "/auth/student/login", student_a_credentials)
        api_response = response.get("response", {})
        
        if success and api_response.get("success") and api_response.get("data", {}).get("access_token"):
            self.student_token = api_response["data"]["access_token"]
            user_data = api_response["data"].get("user", {})
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
                api_response
            )
        
        # Test 5: Student Authentication - Student B
        student_b_credentials = {"reg_number": "24G31A0521", "dob": "2003-01-07"}
        success, response = self.make_request("POST", "/auth/student/login", student_b_credentials)
        api_response = response.get("response", {})
        self.log_test(
            "Student Authentication - Student B Login",
            success and api_response.get("success") and api_response.get("data", {}).get("access_token") is not None,
            "Student B login successful" if success else "Student B login failed",
            api_response.get("data", {}).get("user") if success else api_response
        )
        
        # Test 6: JWT Token Verification
        print("\n=== TESTING JWT TOKEN VERIFICATION ===")
        if self.admin_token:
            success, response = self.make_request("POST", "/auth/verify-token", token=self.admin_token)
            api_response = response.get("response", {})
            self.log_test(
                "JWT Verification - Valid Admin Token",
                success and api_response.get("success") and api_response.get("data", {}).get("user") is not None,
                "Admin token verification successful" if success else "Admin token verification failed",
                api_response.get("data", {}).get("user") if success else api_response
            )
        
        if self.student_token:
            success, response = self.make_request("POST", "/auth/verify-token", token=self.student_token)
            api_response = response.get("response", {})
            self.log_test(
                "JWT Verification - Valid Student Token",
                success and api_response.get("success") and api_response.get("data", {}).get("user") is not None,
                "Student token verification successful" if success else "Student token verification failed",
                api_response.get("data", {}).get("user") if success else api_response
            )
        
        # Test 7: Student Management CRUD
        print("\n=== TESTING STUDENT MANAGEMENT ===")
        if self.admin_token:
            # Get all students
            success, response = self.make_request("GET", "/students/", token=self.admin_token)
            api_response = response.get("response", {})
            students_data = api_response.get("data", {}) if success else {}
            self.log_test(
                "Student Management - Get All Students",
                success and api_response.get("success") and "students" in students_data,
                f"Retrieved {len(students_data.get('students', []))} students" if success else "Failed to retrieve students",
                {"count": len(students_data.get("students", []))} if success else api_response
            )
            
            # Get students by section A
            success, response = self.make_request("GET", "/students/", params={"section": "A"}, token=self.admin_token)
            api_response = response.get("response", {})
            students_data = api_response.get("data", {}) if success else {}
            self.log_test(
                "Student Management - Get Students by Section A",
                success and api_response.get("success") and "students" in students_data,
                f"Retrieved {len(students_data.get('students', []))} students from section A" if success else "Failed to retrieve section A students",
                {"count": len(students_data.get("students", []))} if success else api_response
            )
            
            # Get section summary
            success, response = self.make_request("GET", "/students/sections/summary", token=self.admin_token)
            api_response = response.get("response", {})
            summary_data = api_response.get("data", {}) if success else {}
            self.log_test(
                "Student Management - Section Summary",
                success and api_response.get("success") and "total_students" in summary_data,
                f"Section summary: {summary_data.get('total_students', 0)} total students" if success else "Failed to get section summary",
                summary_data if success else api_response
            )
        
        # Test 8: Faculty Management CRUD
        print("\n=== TESTING FACULTY MANAGEMENT ===")
        if self.admin_token:
            # Get all faculty
            success, response = self.make_request("GET", "/faculty/", token=self.admin_token)
            api_response = response.get("response", {})
            faculty_data = api_response.get("data", {}) if success else {}
            self.log_test(
                "Faculty Management - Get All Faculty",
                success and api_response.get("success") and "faculty" in faculty_data,
                f"Retrieved {len(faculty_data.get('faculty', []))} faculty members" if success else "Failed to retrieve faculty",
                {"count": len(faculty_data.get("faculty", []))} if success else api_response
            )
            
            # Get faculty by section A
            success, response = self.make_request("GET", "/faculty/by-section/A", token=self.admin_token)
            api_response = response.get("response", {})
            faculty_data = api_response.get("data", {}) if success else {}
            self.log_test(
                "Faculty Management - Get Faculty by Section A",
                success and api_response.get("success") and "faculty" in faculty_data,
                f"Retrieved {len(faculty_data.get('faculty', []))} faculty for section A" if success else "Failed to retrieve faculty for section A",
                {"count": len(faculty_data.get("faculty", []))} if success else api_response
            )
            
            # Get subjects list
            success, response = self.make_request("GET", "/faculty/subjects/list", token=self.admin_token)
            api_response = response.get("response", {})
            subjects_data = api_response.get("data", {}) if success else {}
            self.log_test(
                "Faculty Management - Get Subjects List",
                success and api_response.get("success") and "subjects" in subjects_data,
                f"Retrieved {len(subjects_data.get('subjects', []))} subjects" if success else "Failed to retrieve subjects",
                {"subjects": subjects_data.get("subjects", [])} if success else api_response
            )
        
        # Test 9: Feedback System
        print("\n=== TESTING FEEDBACK SYSTEM ===")
        # Get feedback questions (public endpoint)
        success, response = self.make_request("GET", "/feedback/questions")
        api_response = response.get("response", {})
        questions_data = api_response.get("data", {}) if success else {}
        self.log_test(
            "Feedback System - Get Questions",
            success and api_response.get("success") and "questions" in questions_data,
            f"Retrieved {len(questions_data.get('questions', []))} feedback questions" if success else "Failed to retrieve feedback questions",
            {"count": len(questions_data.get("questions", []))} if success else api_response
        )
        
        # Dashboard analytics (admin only)
        if self.admin_token:
            success, response = self.make_request("GET", "/feedback/analytics/dashboard", token=self.admin_token)
            api_response = response.get("response", {})
            dashboard_data = api_response.get("data", {}) if success else {}
            self.log_test(
                "Feedback System - Dashboard Analytics",
                success and api_response.get("success") and "total_students" in dashboard_data,
                "Dashboard analytics retrieved successfully" if success else "Failed to retrieve dashboard analytics",
                {
                    "total_students": dashboard_data.get("total_students", 0),
                    "total_faculty": dashboard_data.get("total_faculty", 0),
                    "total_feedback_submissions": dashboard_data.get("total_feedback_submissions", 0)
                } if success else api_response
            )
        
        # Test 10: Role-based Access Control
        print("\n=== TESTING ROLE-BASED ACCESS CONTROL ===")
        # Test student trying to access admin endpoint
        if self.student_token:
            success, response = self.make_request("GET", "/students/", token=self.student_token)
            api_response = response.get("response", {})
            self.log_test(
                "RBAC - Student Access to Admin Endpoint",
                not success or response.get("status_code") == 403 or not api_response.get("success"),
                "Student properly denied access to admin endpoint" if (not success or response.get("status_code") == 403 or not api_response.get("success")) else "Security issue: student can access admin endpoint",
                api_response
            )
        
        # Test unauthenticated access
        success, response = self.make_request("GET", "/students/")
        api_response = response.get("response", {})
        self.log_test(
            "RBAC - Unauthenticated Access",
            not success or response.get("status_code") in [401, 403] or not api_response.get("success"),
            "Unauthenticated access properly denied" if (not success or response.get("status_code") in [401, 403] or not api_response.get("success")) else "Security issue: unauthenticated access allowed",
            api_response
        )
        
        # Test 11: Database Operations
        print("\n=== TESTING DATABASE OPERATIONS ===")
        if self.admin_token:
            # Test data persistence by checking if students exist
            success, response = self.make_request("GET", "/students/", token=self.admin_token)
            api_response = response.get("response", {})
            students_data = api_response.get("data", {}) if success else {}
            students = students_data.get("students", [])
            
            self.log_test(
                "Database Operations - Data Persistence",
                success and len(students) > 0,
                f"Database contains {len(students)} students - data persistence working" if success and len(students) > 0 else "No students found in database",
                {"students_count": len(students)}
            )
            
            # Test aggregation operations (section summary)
            success, response = self.make_request("GET", "/students/sections/summary", token=self.admin_token)
            api_response = response.get("response", {})
            summary_data = api_response.get("data", {}) if success else {}
            self.log_test(
                "Database Operations - Aggregation",
                success and api_response.get("success") and isinstance(summary_data.get("total_students"), int),
                f"Database aggregation working - Total: {summary_data.get('total_students', 0)}, Section A: {summary_data.get('section_a', 0)}, Section B: {summary_data.get('section_b', 0)}" if success else "Database aggregation failed",
                summary_data if success else api_response
            )
        
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
        with open("/app/test_results_detailed_fixed.json", "w") as f:
            json.dump(tester.test_results, f, indent=2, default=str)
        
        print(f"\n📝 Detailed results saved to: /app/test_results_detailed_fixed.json")
        
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