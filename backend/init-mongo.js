// MongoDB initialization script
db = db.getSiblingDB('student_feedback_db');

// Create collections with validation
db.createCollection('students', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['reg_number', 'name', 'section', 'dob', 'is_active'],
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
      required: ['faculty_id', 'name', 'subjects', 'sections', 'is_active'],
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
      required: ['username', 'password_hash', 'name', 'role'],
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

print('Database initialized successfully');
