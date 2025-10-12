/**
 * Zod validation schemas for forms
 */
import { z } from 'zod';

// Common validation patterns
const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
const regNumberRegex = /^[A-Z0-9]{5,20}$/;

// Student validation schemas
export const studentCreateSchema = z.object({
  reg_number: z.string()
    .min(5, 'Registration number must be at least 5 characters')
    .max(20, 'Registration number must be at most 20 characters')
    .regex(regNumberRegex, 'Invalid registration number format'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  section: z.enum(['A', 'B'], {
    required_error: 'Section is required',
    invalid_type_error: 'Section must be A or B',
  }),
  dob: z.string()
    .min(1, 'Date of birth is required')
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 16 && age <= 100;
    }, 'Age must be between 16 and 100 years'),
  email: z.string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .regex(phoneRegex, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  department: z.string()
    .min(1, 'Department is required')
    .max(50, 'Department name too long'),
  batch_year: z.string()
    .min(4, 'Batch year must be at least 4 digits')
    .max(4, 'Batch year must be at most 4 digits')
    .regex(/^\d{4}$/, 'Batch year must be a 4-digit number'),
});

export const studentUpdateSchema = studentCreateSchema.partial().extend({
  id: z.string().min(1, 'Student ID is required'),
});

// Faculty validation schemas
export const facultyCreateSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .regex(/^[a-zA-Z\s\.]+$/, 'Name can only contain letters, spaces, and dots'),
  email: z.string()
    .email('Invalid email format'),
  phone: z.string()
    .regex(phoneRegex, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  department: z.string()
    .min(1, 'Department is required')
    .max(50, 'Department name too long'),
  subjects: z.array(z.string())
    .min(1, 'At least one subject is required')
    .max(10, 'Maximum 10 subjects allowed'),
  sections: z.array(z.enum(['A', 'B']))
    .min(1, 'At least one section is required')
    .max(2, 'Maximum 2 sections allowed'),
});

export const facultyUpdateSchema = facultyCreateSchema.partial().extend({
  id: z.string().min(1, 'Faculty ID is required'),
});

// Admin validation schemas
export const adminCreateSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one digit')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  role: z.enum(['hod', 'principal'], {
    required_error: 'Role is required',
    invalid_type_error: 'Role must be hod or principal',
  }),
  email: z.string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .regex(phoneRegex, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  department: z.string()
    .min(1, 'Department is required')
    .max(50, 'Department name too long')
    .optional(),
});

// Authentication schemas
export const studentLoginSchema = z.object({
  reg_number: z.string()
    .min(1, 'Registration number is required'),
  dob: z.string()
    .min(1, 'Date of birth is required'),
});

export const adminLoginSchema = z.object({
  username: z.string()
    .min(1, 'Username is required'),
  password: z.string()
    .min(1, 'Password is required'),
});

// Password reset schemas
export const passwordResetRequestSchema = z.object({
  email: z.string()
    .email('Invalid email format'),
});

export const passwordResetSchema = z.object({
  token: z.string()
    .min(1, 'Reset token is required'),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one digit')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
});

// Feedback validation schemas
export const questionRatingSchema = z.object({
  question_id: z.string().min(1, 'Question ID is required'),
  question: z.string().min(1, 'Question is required'),
  rating: z.number()
    .min(1, 'Rating must be at least 1')
    .max(10, 'Rating must be at most 10')
    .int('Rating must be a whole number'),
  weight: z.number()
    .min(0, 'Weight must be at least 0')
    .max(100, 'Weight must be at most 100'),
});

export const individualFeedbackSchema = z.object({
  faculty_id: z.string().min(1, 'Faculty ID is required'),
  faculty_name: z.string().min(1, 'Faculty name is required'),
  subject: z.string().min(1, 'Subject is required'),
  question_ratings: z.array(questionRatingSchema)
    .min(1, 'At least one question rating is required'),
  overall_rating: z.number()
    .min(1, 'Overall rating must be at least 1')
    .max(10, 'Overall rating must be at most 10'),
  weighted_score: z.number()
    .min(0, 'Weighted score must be at least 0')
    .max(100, 'Weighted score must be at most 100'),
  grade_interpretation: z.enum(['Excellent', 'Good', 'Average', 'Needs Improvement']),
  detailed_feedback: z.string()
    .max(500, 'Detailed feedback must be at most 500 characters')
    .optional()
    .or(z.literal('')),
  suggestions: z.string()
    .max(500, 'Suggestions must be at most 500 characters')
    .optional()
    .or(z.literal('')),
});

export const feedbackSubmissionSchema = z.object({
  student_section: z.enum(['A', 'B'], {
    required_error: 'Student section is required',
  }),
  semester: z.string()
    .min(1, 'Semester is required')
    .max(20, 'Semester name too long'),
  academic_year: z.string()
    .min(4, 'Academic year must be at least 4 characters')
    .max(10, 'Academic year must be at most 10 characters'),
  faculty_feedbacks: z.array(individualFeedbackSchema)
    .min(1, 'At least one faculty feedback is required'),
  is_anonymous: z.boolean().default(true),
});

// Search and filter schemas
export const searchFilterSchema = z.object({
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
  fields: z.array(z.string()).optional(),
});

// Bulk operation schemas
export const bulkCreateSchema = z.object({
  items: z.array(z.any())
    .min(1, 'At least one item is required')
    .max(1000, 'Maximum 1000 items allowed'),
});

export const bulkUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string().min(1, 'ID is required'),
    data: z.any(),
  }))
    .min(1, 'At least one update is required')
    .max(1000, 'Maximum 1000 updates allowed'),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string())
    .min(1, 'At least one ID is required')
    .max(1000, 'Maximum 1000 IDs allowed'),
});

// Export types
export type StudentCreate = z.infer<typeof studentCreateSchema>;
export type StudentUpdate = z.infer<typeof studentUpdateSchema>;
export type FacultyCreate = z.infer<typeof facultyCreateSchema>;
export type FacultyUpdate = z.infer<typeof facultyUpdateSchema>;
export type AdminCreate = z.infer<typeof adminCreateSchema>;
export type StudentLogin = z.infer<typeof studentLoginSchema>;
export type AdminLogin = z.infer<typeof adminLoginSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordReset = z.infer<typeof passwordResetSchema>;
export type QuestionRating = z.infer<typeof questionRatingSchema>;
export type IndividualFeedback = z.infer<typeof individualFeedbackSchema>;
export type FeedbackSubmission = z.infer<typeof feedbackSubmissionSchema>;
export type SearchFilter = z.infer<typeof searchFilterSchema>;
export type BulkCreate = z.infer<typeof bulkCreateSchema>;
export type BulkUpdate = z.infer<typeof bulkUpdateSchema>;
export type BulkDelete = z.infer<typeof bulkDeleteSchema>;
