export interface Teacher {
  id: string;
  name: string;
  subject: string;
  sections: ('A' | 'B')[];
}

export interface QuestionRating {
  questionId: string;
  question: string;
  rating: number;
}

export interface IndividualFeedback {
  teacherId: string;
  teacherName: string;
  subject: string;
  questionRatings: QuestionRating[];
  overallRating: number;
  detailedFeedback?: string; // Optional detailed feedback
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

// Feedback questions
export const FEEDBACK_QUESTIONS = [
  {
    id: 'teaching_quality',
    question: 'How would you rate the overall teaching quality?',
    category: 'Teaching'
  },
  {
    id: 'subject_knowledge',
    question: 'How well does the teacher demonstrate subject knowledge?',
    category: 'Knowledge'
  },
  {
    id: 'communication',
    question: 'How clear and effective is the teacher\'s communication?',
    category: 'Communication'
  },
  {
    id: 'engagement',
    question: 'How engaging are the classes and teaching methods?',
    category: 'Engagement'
  },
  {
    id: 'availability',
    question: 'How accessible is the teacher for doubts and guidance?',
    category: 'Availability'
  },
  {
    id: 'preparation',
    question: 'How well-prepared does the teacher come to class?',
    category: 'Preparation'
  },
  {
    id: 'practical_approach',
    question: 'How effectively does the teacher use practical examples?',
    category: 'Practical'
  },
  {
    id: 'assessment',
    question: 'How fair and helpful are the assessments and feedback?',
    category: 'Assessment'
  },
  {
    id: 'classroom_management',
    question: 'How well does the teacher manage the classroom environment?',
    category: 'Management'
  },
  {
    id: 'motivation',
    question: 'How well does the teacher motivate students to learn?',
    category: 'Motivation'
  }
];