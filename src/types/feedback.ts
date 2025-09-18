export interface Teacher {
  id: string;
  name: string;
  subject: string;
  sections: ('A' | 'B')[];
}

export interface IndividualFeedback {
  teacherId: string;
  teacherName: string;
  subject: string;
  rating: number;
  feedback: string;
  suggestions: string;
}

export interface BundledFeedback {
  id: string;
  studentName: string; // e.g., "Anonymous Student 1"
  studentSection: 'A' | 'B';
  teacherFeedbacks: IndividualFeedback[];
  submittedAt: string;
}

// Legacy feedback interface for backward compatibility
export interface LegacyFeedbackData {
  id: string;
  subject: string;
  faculty: string;
  rating: number;
  feedback: string;
  suggestions: string;
  submittedAt: string;
  studentSection: string;
}