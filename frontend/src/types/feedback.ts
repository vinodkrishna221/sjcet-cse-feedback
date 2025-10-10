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
  weight: number;
}

export type GradeInterpretation = 'Excellent' | 'Very Good' | 'Good' | 'Average' | 'Needs Improvement';

export interface IndividualFeedback {
  teacherId: string;
  teacherName: string;
  subject: string;
  questionRatings: QuestionRating[];
  overallRating: number;
  weightedScore: number; // Overall weighted percentage (0-100)
  gradeInterpretation: GradeInterpretation;
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

// Department and Batch Year interfaces
export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  hod?: {
    id: string;
    name: string;
    username: string;
  };
  hod_name?: string;
  is_active?: boolean;
  created_at: string;
}

export interface BatchYear {
  id: string;
  year_range: string; // e.g., "2024-2028"
  department: string;
  sections: ('A' | 'B' | 'C' | 'D')[];
  created_at: string;
}

export interface SectionInfo {
  section: 'A' | 'B' | 'C' | 'D';
  batch_year: string;
  batch_id: string;
}

export interface HODCreate {
  username: string;
  password: string;
  name: string;
  department: string;
  email?: string;
  phone?: string;
}

// Weighted Feedback questions
export const FEEDBACK_QUESTIONS = [
  {
    id: 'punctuality',
    question: 'Punctuality',
    weight: 10.0,
    category: 'Professionalism'
  },
  {
    id: 'voice_clarity',
    question: 'Voice Clarity and Audibility',
    weight: 10.0,
    category: 'Communication'
  },
  {
    id: 'blackboard_usage',
    question: 'Usage of Blackboard and Legibility of Handwriting on the Board',
    weight: 10.0,
    category: 'Teaching Method'
  },
  {
    id: 'student_interaction',
    question: 'Interaction with Students and Clarification of Doubts During the Class',
    weight: 15.0,
    category: 'Student Engagement'
  },
  {
    id: 'class_inspiring',
    question: 'Making the Class Inspiring and Interesting',
    weight: 15.0,
    category: 'Teaching Quality'
  },
  {
    id: 'discipline_maintenance',
    question: 'Maintenance of Discipline in the Classroom',
    weight: 10.0,
    category: 'Classroom Management'
  },
  {
    id: 'availability_outside',
    question: 'Availability in the Campus Outside the Classroom',
    weight: 5.0,
    category: 'Accessibility'
  },
  {
    id: 'syllabus_coverage',
    question: 'Rate of Syllabus Coverage',
    weight: 10.0,
    category: 'Curriculum'
  },
  {
    id: 'paper_analysis',
    question: 'Analysis of Mid Papers & University Papers in the Class',
    weight: 10.0,
    category: 'Assessment'
  },
  {
    id: 'question_bank',
    question: 'Giving Question Bank and Necessary Material',
    weight: 5.0,
    category: 'Resources'
  }
];

// Helper function to calculate weighted score
export const calculateWeightedScore = (questionRatings: QuestionRating[]): { score: number; grade: GradeInterpretation } => {
  if (!questionRatings || questionRatings.length === 0) {
    return { score: 0, grade: 'Needs Improvement' };
  }
  
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  for (const rating of questionRatings) {
    // Convert 1-10 scale to percentage and apply weight
    const scorePercentage = (rating.rating / 10.0) * 100;
    const weightedScore = scorePercentage * (rating.weight / 100.0);
    totalWeightedScore += weightedScore;
    totalWeight += rating.weight;
  }
  
  // Normalize by total weight if it doesn't equal 100%
  const finalScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;
  
  // Determine grade interpretation
  let grade: GradeInterpretation;
  if (finalScore >= 90) {
    grade = 'Excellent';
  } else if (finalScore >= 80) {
    grade = 'Very Good';
  } else if (finalScore >= 70) {
    grade = 'Good';
  } else if (finalScore >= 60) {
    grade = 'Average';
  } else {
    grade = 'Needs Improvement';
  }
  
  return { score: Math.round(finalScore * 100) / 100, grade };
};