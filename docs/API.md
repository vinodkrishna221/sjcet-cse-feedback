# API Documentation

## Overview

The Feedback Management System API provides RESTful endpoints for managing students, faculty, feedback submissions, and administrative functions. The API follows REST conventions and returns JSON responses.

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-token>
```

### Token Types

- **Access Token**: Short-lived (2 hours), used for API requests
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Authentication Endpoints

### Admin Login

**POST** `/auth/admin-login`

Login for administrators (HOD, Principal, Admin).

**Request Body:**
```json
{
  "email": "admin@college.edu",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "admin-1",
      "email": "admin@college.edu",
      "role": "hod",
      "name": "Admin User",
      "department": "CSE"
    },
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "expires_in": 7200
  }
}
```

### Student Login

**POST** `/auth/student-login`

Login for students.

**Request Body:**
```json
{
  "reg_number": "REG001",
  "password": "StudentPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "student-1",
      "reg_number": "REG001",
      "name": "John Doe",
      "section": "A",
      "department": "CSE",
      "batch_year": "2023"
    },
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "expires_in": 7200
  }
}
```

### Refresh Token

**POST** `/auth/refresh`

Obtain a new access token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "expires_in": 7200
  }
}
```

### Password Reset Request

**POST** `/auth/request-password-reset`

Request password reset email.

**Request Body:**
```json
{
  "email": "user@college.edu"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent"
}
```

### Password Reset

**POST** `/auth/reset-password`

Reset password using reset token.

**Request Body:**
```json
{
  "token": "reset-token-here",
  "new_password": "NewSecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

## Student Management

### Get All Students

**GET** `/students/`

Retrieve paginated list of students.

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 10)
- `department` (string): Filter by department
- `section` (string): Filter by section
- `batch_year` (string): Filter by batch year
- `search` (string): Search by name or reg_number

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "student-1",
        "name": "John Doe",
        "reg_number": "REG001",
        "section": "A",
        "department": "CSE",
        "batch_year": "2023",
        "email": "john@college.edu",
        "phone": "1234567890",
        "address": "123 Main St",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "is_active": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
```

### Get Student by ID

**GET** `/students/{student_id}`

Retrieve a specific student.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "student-1",
    "name": "John Doe",
    "reg_number": "REG001",
    "section": "A",
    "department": "CSE",
    "batch_year": "2023",
    "email": "john@college.edu",
    "phone": "1234567890",
    "address": "123 Main St",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "is_active": true
  }
}
```

### Create Student

**POST** `/students/`

Create a new student.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "reg_number": "REG002",
  "section": "B",
  "department": "ECE",
  "batch_year": "2023",
  "email": "jane@college.edu",
  "phone": "0987654321",
  "address": "456 Oak Ave"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "student-2",
    "name": "Jane Smith",
    "reg_number": "REG002",
    "section": "B",
    "department": "ECE",
    "batch_year": "2023",
    "email": "jane@college.edu",
    "phone": "0987654321",
    "address": "456 Oak Ave",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "is_active": true
  }
}
```

### Update Student

**PUT** `/students/{student_id}`

Update an existing student.

**Request Body:**
```json
{
  "name": "Jane Smith Updated",
  "phone": "1111111111",
  "address": "789 Pine St"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "student-2",
    "name": "Jane Smith Updated",
    "reg_number": "REG002",
    "section": "B",
    "department": "ECE",
    "batch_year": "2023",
    "email": "jane@college.edu",
    "phone": "1111111111",
    "address": "789 Pine St",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "is_active": true
  }
}
```

### Delete Student

**DELETE** `/students/{student_id}`

Soft delete a student.

**Response:**
```json
{
  "success": true,
  "message": "Student deleted successfully"
}
```

### Bulk Operations

#### Bulk Create Students

**POST** `/students/bulk-create`

Create multiple students at once.

**Request Body:**
```json
{
  "items": [
    {
      "name": "Student 1",
      "reg_number": "REG003",
      "section": "A",
      "department": "CSE",
      "batch_year": "2023"
    },
    {
      "name": "Student 2",
      "reg_number": "REG004",
      "section": "B",
      "department": "ECE",
      "batch_year": "2023"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "successful": 2,
    "failed": 0,
    "errors": []
  }
}
```

#### Bulk Update Students

**PUT** `/students/bulk-update`

Update multiple students at once.

**Request Body:**
```json
{
  "items": [
    {
      "id": "student-1",
      "changes": {
        "phone": "9999999999"
      }
    },
    {
      "id": "student-2",
      "changes": {
        "address": "New Address"
      }
    }
  ]
}
```

#### Bulk Delete Students

**DELETE** `/students/bulk-delete`

Delete multiple students at once.

**Request Body:**
```json
{
  "ids": ["student-1", "student-2", "student-3"]
}
```

## Faculty Management

### Get All Faculty

**GET** `/faculty/`

Retrieve paginated list of faculty.

**Query Parameters:**
- `page` (int): Page number
- `limit` (int): Items per page
- `department` (string): Filter by department
- `search` (string): Search by name or employee_id

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "faculty-1",
        "name": "Dr. Smith",
        "employee_id": "FAC001",
        "department": "CSE",
        "subjects": ["Data Structures", "Algorithms"],
        "email": "smith@college.edu",
        "phone": "1234567890",
        "qualification": "Ph.D. Computer Science",
        "experience": 10,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "is_active": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```

### Create Faculty

**POST** `/faculty/`

Create a new faculty member.

**Request Body:**
```json
{
  "name": "Dr. Johnson",
  "employee_id": "FAC002",
  "department": "ECE",
  "subjects": ["Digital Electronics", "Microprocessors"],
  "email": "johnson@college.edu",
  "phone": "0987654321",
  "qualification": "Ph.D. Electronics",
  "experience": 8
}
```

## Feedback Management

### Submit Feedback

**POST** `/feedback/submit`

Submit feedback for faculty.

**Request Body:**
```json
{
  "student_section": "A",
  "semester": "1",
  "academic_year": "2023-24",
  "faculty_feedbacks": [
    {
      "faculty_id": "faculty-1",
      "faculty_name": "Dr. Smith",
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
      "detailed_feedback": "Good teaching methods",
      "suggestions": "More practical examples"
    }
  ],
  "is_anonymous": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "feedback-1",
    "student_id": "student-1",
    "student_section": "A",
    "semester": "1",
    "academic_year": "2023-24",
    "faculty_feedbacks": [...],
    "is_anonymous": true,
    "submitted_at": "2024-01-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "is_active": true
  }
}
```

### Get Feedback Analytics

**GET** `/feedback/analytics`

Get feedback analytics and statistics.

**Query Parameters:**
- `department` (string): Filter by department
- `semester` (string): Filter by semester
- `academic_year` (string): Filter by academic year
- `faculty_id` (string): Filter by faculty

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_submissions": 150,
      "average_rating": 7.8,
      "response_rate": 85.5
    },
    "department_stats": [
      {
        "department": "CSE",
        "total_feedback": 75,
        "average_rating": 8.2
      }
    ],
    "faculty_stats": [
      {
        "faculty_id": "faculty-1",
        "faculty_name": "Dr. Smith",
        "total_feedback": 25,
        "average_rating": 8.5,
        "subjects": ["Data Structures", "Algorithms"]
      }
    ],
    "trends": {
      "monthly_submissions": [
        {"month": "2024-01", "count": 50},
        {"month": "2024-02", "count": 45}
      ]
    }
  }
}
```

## Report Generation

### Generate Report

**POST** `/reports/generate`

Generate a report with specified parameters.

**Request Body:**
```json
{
  "report_type": "faculty_performance",
  "format": "pdf",
  "filters": {
    "department": "CSE",
    "semester": "1",
    "academic_year": "2023-24"
  },
  "options": {
    "include_charts": true,
    "include_detailed_feedback": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "report_id": "report-1",
    "status": "processing",
    "download_url": null,
    "estimated_completion": "2024-01-01T00:05:00Z"
  }
}
```

### Get Report Status

**GET** `/reports/{report_id}/status`

Check the status of a report generation.

**Response:**
```json
{
  "success": true,
  "data": {
    "report_id": "report-1",
    "status": "completed",
    "download_url": "http://localhost:8000/reports/download/report-1",
    "file_size": 1024000,
    "created_at": "2024-01-01T00:00:00Z",
    "completed_at": "2024-01-01T00:05:00Z"
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Anonymous users**: 30 requests per minute
- **Authenticated users**: 100 requests per minute
- **Admin users**: 200 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination with these parameters:

- `page`: Page number (1-based)
- `limit`: Items per page (max 100)

Pagination metadata is included in responses:
```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10,
    "has_next": true,
    "has_prev": false
  }
}
```

## Field Selection

Some endpoints support field selection to reduce response size:

**GET** `/students/?fields=name,reg_number,department`

This will return only the specified fields in the response.

## Bulk Operations

Bulk operations are available for:
- Creating multiple records
- Updating multiple records
- Deleting multiple records

Bulk operations return detailed results including:
- Number of successful operations
- Number of failed operations
- Detailed error messages for failures

## Webhooks

The API supports webhooks for real-time notifications:

- **Feedback submitted**: Notify when new feedback is submitted
- **Report completed**: Notify when report generation is complete
- **User created**: Notify when new users are created

Webhook endpoints must be configured in the admin panel.
