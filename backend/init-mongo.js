// MongoDB initialization script
db = db.getSiblingDB('student_feedback_db');

// Create collections with validation
db.createCollection('students', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['reg_number', 'name', 'section', 'dob', 'department', 'batch_year', 'is_active'],
      properties: {
        reg_number: {
          bsonType: 'string',
          minLength: 5,
          maxLength: 20
        },
        name: {
          bsonType: 'string',
          minLength: 2,
          maxLength: 100
        },
        section: {
          bsonType: 'string',
          enum: ['A', 'B', 'C', 'D']
        },
        dob: {
          bsonType: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$'
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        phone: {
          bsonType: 'string',
          pattern: '^\\+?[\\d\\s\\-\\(\\)]{10,15}$'
        },
        department: {
          bsonType: 'string',
          minLength: 2,
          maxLength: 50
        },
        batch_year: {
          bsonType: 'string',
          pattern: '^\\d{4}-\\d{4}$'
        },
        is_active: {
          bsonType: 'bool'
        }
      }
    }
  }
});

db.createCollection('faculty', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['faculty_id', 'name', 'subjects', 'sections', 'department', 'is_active'],
      properties: {
        faculty_id: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 20
        },
        name: {
          bsonType: 'string',
          minLength: 2,
          maxLength: 100
        },
        subjects: {
          bsonType: 'array',
          items: {
            bsonType: 'string'
          }
        },
        sections: {
          bsonType: 'array',
          items: {
            bsonType: 'string',
            enum: ['A', 'B', 'C', 'D']
          }
        },
        department: {
          bsonType: 'string',
          minLength: 2,
          maxLength: 50
        },
        is_active: {
          bsonType: 'bool'
        }
      }
    }
  }
});

db.createCollection('admins', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['username', 'password_hash', 'name', 'role', 'is_active'],
      properties: {
        username: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 50
        },
        name: {
          bsonType: 'string',
          minLength: 2,
          maxLength: 100
        },
        role: {
          bsonType: 'string',
          enum: ['hod', 'principal']
        },
        department: {
          bsonType: 'string',
          minLength: 2,
          maxLength: 50
        },
        is_active: {
          bsonType: 'bool'
        }
      }
    }
  }
});

db.createCollection('feedback_submissions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['student_section', 'faculty_feedbacks', 'submitted_at', 'is_anonymous'],
      properties: {
        student_section: {
          bsonType: 'string',
          enum: ['A', 'B', 'C', 'D']
        },
        faculty_feedbacks: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['faculty_id', 'faculty_name', 'subject', 'question_ratings', 'overall_rating'],
            properties: {
              faculty_id: {
                bsonType: 'string'
              },
              faculty_name: {
                bsonType: 'string'
              },
              subject: {
                bsonType: 'string'
              },
              overall_rating: {
                bsonType: 'number',
                minimum: 1,
                maximum: 5
              }
            }
          }
        },
        is_anonymous: {
          bsonType: 'bool'
        }
      }
    }
  }
});

// Create departments collection
db.createCollection('departments', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'code', 'is_active'],
      properties: {
        name: {
          bsonType: 'string',
          minLength: 2,
          maxLength: 100
        },
        code: {
          bsonType: 'string',
          minLength: 2,
          maxLength: 10
        },
        description: {
          bsonType: 'string',
          maxLength: 500
        },
        hod_id: {
          bsonType: 'string'
        },
        is_active: {
          bsonType: 'bool'
        }
      }
    }
  }
});

// Create batch_years collection
db.createCollection('batch_years', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['year_range', 'department', 'sections', 'is_active'],
      properties: {
        year_range: {
          bsonType: 'string',
          pattern: '^\\d{4}-\\d{4}$'
        },
        department: {
          bsonType: 'string',
          minLength: 2,
          maxLength: 50
        },
        sections: {
          bsonType: 'array',
          items: {
            bsonType: 'string',
            enum: ['A', 'B', 'C', 'D']
          }
        },
        is_active: {
          bsonType: 'bool'
        }
      }
    }
  }
});

// Create password reset tokens collection
db.createCollection('password_reset_tokens', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['token', 'user_id', 'user_type', 'email', 'expires_at', 'used'],
      properties: {
        token: {
          bsonType: 'string',
          minLength: 32,
          maxLength: 64
        },
        user_id: {
          bsonType: 'string'
        },
        user_type: {
          bsonType: 'string',
          enum: ['admin', 'student']
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        expires_at: {
          bsonType: 'date'
        },
        used: {
          bsonType: 'bool'
        },
        used_at: {
          bsonType: 'date'
        }
      }
    }
  }
});

// Create indexes for password reset tokens
db.password_reset_tokens.createIndex({ "token": 1 }, { unique: true });
db.password_reset_tokens.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 });
db.password_reset_tokens.createIndex({ "user_id": 1, "user_type": 1 });

// Create feedback drafts collection
db.createCollection('feedback_drafts', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['student_id', 'student_section', 'semester', 'academic_year', 'faculty_feedbacks', 'draft_saved_at'],
      properties: {
        student_id: { bsonType: 'string' },
        student_section: { bsonType: 'string', enum: ['A', 'B'] },
        semester: { bsonType: 'string' },
        academic_year: { bsonType: 'string' },
        faculty_feedbacks: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['faculty_id', 'faculty_name', 'subject', 'question_ratings', 'overall_rating'],
            properties: {
              faculty_id: { bsonType: 'string' },
              faculty_name: { bsonType: 'string' },
              subject: { bsonType: 'string' },
              question_ratings: {
                bsonType: 'array',
                items: {
                  bsonType: 'object',
                  required: ['question_id', 'question', 'rating', 'weight'],
                  properties: {
                    question_id: { bsonType: 'string' },
                    question: { bsonType: 'string' },
                    rating: { bsonType: 'int', minimum: 1, maximum: 10 },
                    weight: { bsonType: 'int', minimum: 0, maximum: 100 }
                  }
                }
              },
              overall_rating: { bsonType: 'int', minimum: 1, maximum: 10 },
              weighted_score: { bsonType: 'double', minimum: 0, maximum: 100 },
              grade_interpretation: { bsonType: 'string', enum: ['Excellent', 'Good', 'Average', 'Needs Improvement'] },
              detailed_feedback: { bsonType: 'string' },
              suggestions: { bsonType: 'string' }
            }
          }
        },
        is_anonymous: { bsonType: 'bool' },
        draft_saved_at: { bsonType: 'date' },
        created_at: { bsonType: 'date' },
        updated_at: { bsonType: 'date' }
      }
    }
  }
});

// Create indexes for feedback drafts
db.feedback_drafts.createIndex({ "student_id": 1, "semester": 1, "academic_year": 1 });
db.feedback_drafts.createIndex({ "draft_saved_at": -1 });
db.feedback_drafts.createIndex({ "student_id": 1, "draft_saved_at": -1 });

// Create additional performance indexes
db.students.createIndex({ "section": 1, "batch_year": 1 });
db.students.createIndex({ "department": 1, "is_active": 1 });
db.students.createIndex({ "name": "text", "reg_number": "text" });

db.faculty.createIndex({ "department": 1, "is_active": 1 });
db.faculty.createIndex({ "subjects": 1 });
db.faculty.createIndex({ "name": "text" });

db.feedback_submissions.createIndex({ "student_section": 1, "semester": 1, "academic_year": 1 });
db.feedback_submissions.createIndex({ "submitted_at": -1, "student_section": 1 });
db.feedback_submissions.createIndex({ "faculty_feedbacks.faculty_id": 1 });
db.feedback_submissions.createIndex({ "anonymous_id": 1 }, { unique: true });

db.admins.createIndex({ "role": 1, "is_active": 1 });
db.admins.createIndex({ "department": 1, "role": 1 });

// Create compound indexes for common queries
db.feedback_submissions.createIndex({ 
  "student_section": 1, 
  "academic_year": 1, 
  "submitted_at": -1 
});

db.faculty.createIndex({ 
  "department": 1, 
  "subjects": 1, 
  "is_active": 1 
});

print('Database initialized successfully');
