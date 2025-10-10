"""
Integration tests for student management
"""
import pytest
from conftest import TestHelpers, TestDataFactory, DatabaseTestHelper


@pytest.mark.integration
class TestStudentManagement:
    """Test student management functionality."""
    
    async def test_create_student_success(self, test_client, test_db, auth_headers):
        """Test successful student creation."""
        student_data = TestDataFactory.create_student_data()
        
        response = test_client.post("/api/v1/students/", json=student_data, headers=auth_headers)
        
        TestHelpers.assert_response_success(response, 201)
        data = response.json()
        
        assert "data" in data
        assert "id" in data["data"]
        assert data["data"]["name"] == student_data["name"]
        assert data["data"]["reg_number"] == student_data["reg_number"]
        
        # Verify student was created in database
        await DatabaseTestHelper.assert_document_exists(
            test_db, "students", {"reg_number": student_data["reg_number"]}
        )
    
    async def test_create_student_duplicate_reg_number(self, test_client, test_db, auth_headers, sample_student):
        """Test creating student with duplicate registration number."""
        student_data = TestDataFactory.create_student_data({
            "reg_number": sample_student["reg_number"]
        })
        
        response = test_client.post("/api/v1/students/", json=student_data, headers=auth_headers)
        
        TestHelpers.assert_response_error(response, 400)
        data = response.json()
        assert "already exists" in data["message"].lower()
    
    async def test_create_student_invalid_data(self, test_client, auth_headers):
        """Test creating student with invalid data."""
        invalid_data = {
            "name": "",  # Empty name
            "reg_number": "INVALID",  # Invalid format
            "section": "Z",  # Invalid section
            "department": "INVALID",  # Invalid department
            "batch_year": "invalid"  # Invalid year
        }
        
        response = test_client.post("/api/v1/students/", json=invalid_data, headers=auth_headers)
        
        TestHelpers.assert_response_error(response, 422)
        data = response.json()
        assert "errors" in data
    
    async def test_get_students_pagination(self, test_client, test_db, auth_headers):
        """Test getting students with pagination."""
        # Create multiple students
        students = []
        for i in range(15):
            student_data = TestDataFactory.create_student_data({
                "reg_number": f"TEST{i:03d}",
                "name": f"Student {i}"
            })
            students.append(student_data)
            await test_db.students.insert_one(student_data)
        
        # Test first page
        response = test_client.get("/api/v1/students/?page=1&limit=10", headers=auth_headers)
        
        TestHelpers.assert_response_success(response)
        data = TestHelpers.assert_paginated_response(response, 15)
        
        assert len(data["data"]["items"]) == 10
        assert data["data"]["pagination"]["page"] == 1
        assert data["data"]["pagination"]["limit"] == 10
        assert data["data"]["pagination"]["total"] == 15
        assert data["data"]["pagination"]["pages"] == 2
        
        # Test second page
        response = test_client.get("/api/v1/students/?page=2&limit=10", headers=auth_headers)
        
        TestHelpers.assert_response_success(response)
        data = TestHelpers.assert_paginated_response(response, 15)
        
        assert len(data["data"]["items"]) == 5
        assert data["data"]["pagination"]["page"] == 2
    
    async def test_get_students_filtering(self, test_client, test_db, auth_headers):
        """Test getting students with filters."""
        # Create students with different departments and sections
        cse_students = []
        ece_students = []
        
        for i in range(5):
            # CSE students
            student_data = TestDataFactory.create_student_data({
                "reg_number": f"CSE{i:03d}",
                "name": f"CSE Student {i}",
                "department": "CSE",
                "section": "A"
            })
            cse_students.append(student_data)
            await test_db.students.insert_one(student_data)
            
            # ECE students
            student_data = TestDataFactory.create_student_data({
                "reg_number": f"ECE{i:03d}",
                "name": f"ECE Student {i}",
                "department": "ECE",
                "section": "B"
            })
            ece_students.append(student_data)
            await test_db.students.insert_one(student_data)
        
        # Filter by department
        response = test_client.get("/api/v1/students/?department=CSE", headers=auth_headers)
        
        TestHelpers.assert_response_success(response)
        data = TestHelpers.assert_paginated_response(response, 5)
        
        for student in data["data"]["items"]:
            assert student["department"] == "CSE"
        
        # Filter by section
        response = test_client.get("/api/v1/students/?section=A", headers=auth_headers)
        
        TestHelpers.assert_response_success(response)
        data = TestHelpers.assert_paginated_response(response, 5)
        
        for student in data["data"]["items"]:
            assert student["section"] == "A"
        
        # Filter by both department and section
        response = test_client.get("/api/v1/students/?department=CSE&section=A", headers=auth_headers)
        
        TestHelpers.assert_response_success(response)
        data = TestHelpers.assert_paginated_response(response, 5)
        
        for student in data["data"]["items"]:
            assert student["department"] == "CSE"
            assert student["section"] == "A"
    
    async def test_get_student_by_id(self, test_client, auth_headers, sample_student):
        """Test getting student by ID."""
        response = test_client.get(f"/api/v1/students/{sample_student['id']}", headers=auth_headers)
        
        TestHelpers.assert_response_success(response)
        data = response.json()
        
        assert "data" in data
        assert data["data"]["id"] == sample_student["id"]
        assert data["data"]["name"] == sample_student["name"]
        assert data["data"]["reg_number"] == sample_student["reg_number"]
    
    async def test_get_student_not_found(self, test_client, auth_headers):
        """Test getting non-existent student."""
        response = test_client.get("/api/v1/students/non-existent-id", headers=auth_headers)
        
        TestHelpers.assert_response_error(response, 404)
        data = response.json()
        assert "not found" in data["message"].lower()
    
    async def test_update_student_success(self, test_client, test_db, auth_headers, sample_student):
        """Test successful student update."""
        update_data = {
            "name": "Updated Student Name",
            "phone": "9876543210",
            "address": "Updated Address"
        }
        
        response = test_client.put(
            f"/api/v1/students/{sample_student['id']}", 
            json=update_data, 
            headers=auth_headers
        )
        
        TestHelpers.assert_response_success(response)
        data = response.json()
        
        assert "data" in data
        assert data["data"]["name"] == update_data["name"]
        assert data["data"]["phone"] == update_data["phone"]
        assert data["data"]["address"] == update_data["address"]
        
        # Verify update in database
        updated_student = await DatabaseTestHelper.assert_document_exists(
            test_db, "students", {"id": sample_student["id"]}
        )
        assert updated_student["name"] == update_data["name"]
        assert updated_student["phone"] == update_data["phone"]
        assert updated_student["address"] == update_data["address"]
    
    async def test_update_student_invalid_data(self, test_client, auth_headers, sample_student):
        """Test updating student with invalid data."""
        invalid_data = {
            "section": "Z",  # Invalid section
            "department": "INVALID",  # Invalid department
            "batch_year": "invalid"  # Invalid year
        }
        
        response = test_client.put(
            f"/api/v1/students/{sample_student['id']}", 
            json=invalid_data, 
            headers=auth_headers
        )
        
        TestHelpers.assert_response_error(response, 422)
        data = response.json()
        assert "errors" in data
    
    async def test_delete_student_success(self, test_client, test_db, auth_headers, sample_student):
        """Test successful student deletion."""
        response = test_client.delete(f"/api/v1/students/{sample_student['id']}", headers=auth_headers)
        
        TestHelpers.assert_response_success(response)
        data = response.json()
        assert "deleted successfully" in data["message"].lower()
        
        # Verify soft delete in database
        deleted_student = await test_db.students.find_one({"id": sample_student["id"]})
        assert deleted_student["is_active"] is False
        assert deleted_student["deleted_at"] is not None
    
    async def test_delete_student_not_found(self, test_client, auth_headers):
        """Test deleting non-existent student."""
        response = test_client.delete("/api/v1/students/non-existent-id", headers=auth_headers)
        
        TestHelpers.assert_response_error(response, 404)
        data = response.json()
        assert "not found" in data["message"].lower()
    
    async def test_bulk_create_students_success(self, test_client, test_db, auth_headers):
        """Test successful bulk student creation."""
        students_data = [
            TestDataFactory.create_student_data({"reg_number": f"BULK{i:03d}", "name": f"Bulk Student {i}"})
            for i in range(5)
        ]
        
        bulk_data = {"items": students_data}
        
        response = test_client.post("/api/v1/students/bulk-create", json=bulk_data, headers=auth_headers)
        
        TestHelpers.assert_response_success(response)
        data = response.json()
        
        assert "data" in data
        assert data["data"]["successful"] == 5
        assert data["data"]["failed"] == 0
        
        # Verify all students were created
        for student_data in students_data:
            await DatabaseTestHelper.assert_document_exists(
                test_db, "students", {"reg_number": student_data["reg_number"]}
            )
    
    async def test_bulk_create_students_partial_failure(self, test_client, test_db, auth_headers, sample_student):
        """Test bulk student creation with partial failures."""
        students_data = [
            TestDataFactory.create_student_data({"reg_number": f"BULK{i:03d}", "name": f"Bulk Student {i}"})
            for i in range(3)
        ]
        
        # Add one with duplicate reg_number
        students_data.append(TestDataFactory.create_student_data({
            "reg_number": sample_student["reg_number"],  # Duplicate
            "name": "Duplicate Student"
        }))
        
        bulk_data = {"items": students_data}
        
        response = test_client.post("/api/v1/students/bulk-create", json=bulk_data, headers=auth_headers)
        
        TestHelpers.assert_response_success(response)
        data = response.json()
        
        assert "data" in data
        assert data["data"]["successful"] == 3
        assert data["data"]["failed"] == 1
        assert len(data["data"]["errors"]) == 1
    
    async def test_bulk_update_students_success(self, test_client, test_db, auth_headers):
        """Test successful bulk student update."""
        # Create test students
        students = []
        for i in range(3):
            student_data = TestDataFactory.create_student_data({
                "reg_number": f"UPDATE{i:03d}",
                "name": f"Update Student {i}"
            })
            await test_db.students.insert_one(student_data)
            students.append(student_data)
        
        # Prepare bulk update data
        updates = [
            {"id": student["id"], "changes": {"phone": f"999{i}000000"}}
            for student in students
        ]
        
        bulk_data = {"items": updates}
        
        response = test_client.put("/api/v1/students/bulk-update", json=bulk_data, headers=auth_headers)
        
        TestHelpers.assert_response_success(response)
        data = response.json()
        
        assert "data" in data
        assert data["data"]["successful"] == 3
        assert data["data"]["failed"] == 0
        
        # Verify updates
        for i, student in enumerate(students):
            updated_student = await DatabaseTestHelper.assert_document_exists(
                test_db, "students", {"id": student["id"]}
            )
            assert updated_student["phone"] == f"999{i}000000"
    
    async def test_bulk_delete_students_success(self, test_client, test_db, auth_headers):
        """Test successful bulk student deletion."""
        # Create test students
        students = []
        for i in range(3):
            student_data = TestDataFactory.create_student_data({
                "reg_number": f"DELETE{i:03d}",
                "name": f"Delete Student {i}"
            })
            await test_db.students.insert_one(student_data)
            students.append(student_data)
        
        student_ids = [student["id"] for student in students]
        
        bulk_data = {"ids": student_ids}
        
        response = test_client.delete("/api/v1/students/bulk-delete", json=bulk_data, headers=auth_headers)
        
        TestHelpers.assert_response_success(response)
        data = response.json()
        
        assert "data" in data
        assert data["data"]["successful"] == 3
        assert data["data"]["failed"] == 0
        
        # Verify soft deletes
        for student in students:
            deleted_student = await test_db.students.find_one({"id": student["id"]})
            assert deleted_student["is_active"] is False
            assert deleted_student["deleted_at"] is not None


@pytest.mark.integration
class TestStudentValidation:
    """Test student validation rules."""
    
    async def test_student_reg_number_uniqueness(self, test_client, test_db, auth_headers, sample_student):
        """Test that registration numbers must be unique."""
        student_data = TestDataFactory.create_student_data({
            "reg_number": sample_student["reg_number"]  # Duplicate
        })
        
        response = test_client.post("/api/v1/students/", json=student_data, headers=auth_headers)
        
        TestHelpers.assert_response_error(response, 400)
        data = response.json()
        assert "already exists" in data["message"].lower()
    
    async def test_student_section_validation(self, test_client, auth_headers):
        """Test student section validation."""
        invalid_sections = ["C", "D", "X", "1", "2"]
        
        for section in invalid_sections:
            student_data = TestDataFactory.create_student_data({
                "reg_number": f"TEST{section}01",
                "section": section
            })
            
            response = test_client.post("/api/v1/students/", json=student_data, headers=auth_headers)
            
            TestHelpers.assert_response_error(response, 422)
            TestHelpers.assert_validation_error(response, "section")
    
    async def test_student_department_validation(self, test_client, auth_headers):
        """Test student department validation."""
        invalid_departments = ["INVALID", "XYZ", "123", ""]
        
        for department in invalid_departments:
            student_data = TestDataFactory.create_student_data({
                "reg_number": f"TEST{department}01",
                "department": department
            })
            
            response = test_client.post("/api/v1/students/", json=student_data, headers=auth_headers)
            
            TestHelpers.assert_response_error(response, 422)
            TestHelpers.assert_validation_error(response, "department")
    
    async def test_student_batch_year_validation(self, test_client, auth_headers):
        """Test student batch year validation."""
        invalid_years = ["invalid", "20", "202", "2030", "1999"]
        
        for year in invalid_years:
            student_data = TestDataFactory.create_student_data({
                "reg_number": f"TEST{year}01",
                "batch_year": year
            })
            
            response = test_client.post("/api/v1/students/", json=student_data, headers=auth_headers)
            
            TestHelpers.assert_response_error(response, 422)
            TestHelpers.assert_validation_error(response, "batch_year")
    
    async def test_student_email_validation(self, test_client, auth_headers):
        """Test student email validation."""
        invalid_emails = ["invalid-email", "@example.com", "test@", "test@.com"]
        
        for email in invalid_emails:
            student_data = TestDataFactory.create_student_data({
                "reg_number": f"TEST{email[:5]}01",
                "email": email
            })
            
            response = test_client.post("/api/v1/students/", json=student_data, headers=auth_headers)
            
            TestHelpers.assert_response_error(response, 422)
            TestHelpers.assert_validation_error(response, "email")
    
    async def test_student_phone_validation(self, test_client, auth_headers):
        """Test student phone validation."""
        invalid_phones = ["123", "123456789", "12345678901", "abc1234567"]
        
        for phone in invalid_phones:
            student_data = TestDataFactory.create_student_data({
                "reg_number": f"TEST{phone[:5]}01",
                "phone": phone
            })
            
            response = test_client.post("/api/v1/students/", json=student_data, headers=auth_headers)
            
            TestHelpers.assert_response_error(response, 422)
            TestHelpers.assert_validation_error(response, "phone")
