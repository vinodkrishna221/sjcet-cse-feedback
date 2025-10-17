/**
 * Utility functions for managing feedback drafts in localStorage
 */

export interface FeedbackDraft {
  teacherFeedbacks: Record<string, any>;
  lastSaved: string;
  studentSection: string;
}

const DRAFT_KEY_PREFIX = 'feedback_draft_';

export const saveFeedbackDraft = (studentSection: string, teacherFeedbacks: Record<string, any>): void => {
  try {
    const draft: FeedbackDraft = {
      teacherFeedbacks,
      lastSaved: new Date().toISOString(),
      studentSection,
    };
    
    const key = `${DRAFT_KEY_PREFIX}${studentSection}`;
    localStorage.setItem(key, JSON.stringify(draft));
    
    console.log('Feedback draft saved successfully');
  } catch (error) {
    console.error('Failed to save feedback draft:', error);
  }
};

export const loadFeedbackDraft = (studentSection: string): FeedbackDraft | null => {
  try {
    const key = `${DRAFT_KEY_PREFIX}${studentSection}`;
    const draftData = localStorage.getItem(key);
    
    if (!draftData) {
      return null;
    }
    
    const draft: FeedbackDraft = JSON.parse(draftData);
    
    // Verify the draft is for the correct section
    if (draft.studentSection !== studentSection) {
      console.warn('Draft section mismatch, clearing draft');
      clearFeedbackDraft(studentSection);
      return null;
    }
    
    return draft;
  } catch (error) {
    console.error('Failed to load feedback draft:', error);
    return null;
  }
};

export const clearFeedbackDraft = (studentSection: string): void => {
  try {
    const key = `${DRAFT_KEY_PREFIX}${studentSection}`;
    localStorage.removeItem(key);
    console.log('Feedback draft cleared');
  } catch (error) {
    console.error('Failed to clear feedback draft:', error);
  }
};

export const hasFeedbackDraft = (studentSection: string): boolean => {
  try {
    const key = `${DRAFT_KEY_PREFIX}${studentSection}`;
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error('Failed to check for feedback draft:', error);
    return false;
  }
};

export const getDraftAge = (draft: FeedbackDraft): number => {
  const now = new Date();
  const saved = new Date(draft.lastSaved);
  return now.getTime() - saved.getTime();
};

export const isDraftRecent = (draft: FeedbackDraft, maxAgeHours: number = 24): boolean => {
  const ageMs = getDraftAge(draft);
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  return ageMs < maxAgeMs;
};
