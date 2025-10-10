/**
 * Enhanced feedback form with semester tracking, draft saving, and editing window
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { feedbackSubmissionSchema, type FeedbackSubmission, type IndividualFeedback } from '@/schemas/validation';
import { FormContainer, FormField, ConfirmationDialog } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  Clock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle, 
  Calendar,
  User,
  BookOpen,
  Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface EnhancedFeedbackFormProps {
  facultyList: Array<{
    id: string;
    name: string;
    subjects: string[];
    sections: string[];
  }>;
  questions: Array<{
    id: string;
    question: string;
    weight: number;
    category: string;
  }>;
  studentSection: string;
  onSubmit: (data: FeedbackSubmission) => Promise<void>;
  onSaveDraft?: (data: Partial<FeedbackSubmission>) => Promise<void>;
  onLoadDraft?: () => Promise<Partial<FeedbackSubmission> | null>;
  isSubmitting?: boolean;
  editingWindow?: {
    startDate: Date;
    endDate: Date;
  };
  allowPartialSubmission?: boolean;
}

export function EnhancedFeedbackForm({
  facultyList,
  questions,
  studentSection,
  onSubmit,
  onSaveDraft,
  onLoadDraft,
  isSubmitting = false,
  editingWindow,
  allowPartialSubmission = true,
}: EnhancedFeedbackFormProps) {
  const { toast } = useToast();
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [currentSemester, setCurrentSemester] = useState('');
  const [currentAcademicYear, setCurrentAcademicYear] = useState('');
  const [draftLastSaved, setDraftLastSaved] = useState<Date | null>(null);
  const [editingExpired, setEditingExpired] = useState(false);

  const form = useForm<FeedbackSubmission>({
    resolver: zodResolver(feedbackSubmissionSchema),
    defaultValues: {
      student_section: studentSection as 'A' | 'B',
      semester: '',
      academic_year: '',
      faculty_feedbacks: [],
      is_anonymous: true,
    },
    mode: 'onChange',
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'faculty_feedbacks',
  });

  const watchedValues = form.watch();
  const debouncedValues = useDebounce(watchedValues, 2000);

  // Check if editing window has expired
  useEffect(() => {
    if (editingWindow) {
      const now = new Date();
      if (now > editingWindow.endDate) {
        setEditingExpired(true);
        toast({
          title: 'Editing Window Expired',
          description: 'The feedback editing window has closed. You can no longer submit feedback.',
          variant: 'destructive',
        });
      }
    }
  }, [editingWindow, toast]);

  // Load draft on component mount
  useEffect(() => {
    const loadDraft = async () => {
      if (onLoadDraft) {
        try {
          const draft = await onLoadDraft();
          if (draft) {
            form.reset(draft);
            setDraftLastSaved(new Date(draft.draft_saved_at || Date.now()));
            toast({
              title: 'Draft Loaded',
              description: 'Your previously saved draft has been loaded.',
            });
          }
        } catch (error) {
          console.error('Failed to load draft:', error);
        }
      }
    };

    loadDraft();
  }, [onLoadDraft, form, toast]);

  // Auto-save draft
  useEffect(() => {
    if (!onSaveDraft || !form.formState.isDirty) return;

    const saveDraft = async () => {
      try {
        setIsDraftSaving(true);
        const formData = form.getValues();
        await onSaveDraft({
          ...formData,
          draft_saved_at: new Date().toISOString(),
        });
        setDraftLastSaved(new Date());
      } catch (error) {
        console.error('Failed to save draft:', error);
        toast({
          title: 'Draft Save Failed',
          description: 'Failed to save your draft. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsDraftSaving(false);
      }
    };

    const timer = setTimeout(saveDraft, 5000);
    return () => clearTimeout(timer);
  }, [debouncedValues, onSaveDraft, form, toast]);

  // Initialize current semester and academic year
  useEffect(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    
    // Determine semester based on month
    const semester = month >= 0 && month <= 5 ? 'Even' : 'Odd';
    const academicYear = `${year}-${year + 1}`;
    
    setCurrentSemester(semester);
    setCurrentAcademicYear(academicYear);
    
    form.setValue('semester', semester);
    form.setValue('academic_year', academicYear);
  }, [form]);

  // Add faculty feedback
  const addFacultyFeedback = useCallback((facultyId: string) => {
    const faculty = facultyList.find(f => f.id === facultyId);
    if (!faculty) return;

    const newFeedback: IndividualFeedback = {
      faculty_id: facultyId,
      faculty_name: faculty.name,
      subject: faculty.subjects[0] || '',
      question_ratings: questions.map(q => ({
        question_id: q.id,
        question: q.question,
        rating: 5,
        weight: q.weight,
      })),
      overall_rating: 5,
      weighted_score: 0,
      grade_interpretation: 'Average',
      detailed_feedback: '',
      suggestions: '',
    };

    append(newFeedback);
  }, [facultyList, questions, append]);

  // Remove faculty feedback
  const removeFacultyFeedback = useCallback((index: number) => {
    remove(index);
  }, [remove]);

  // Calculate weighted score for a faculty
  const calculateWeightedScore = useCallback((questionRatings: Array<{rating: number; weight: number}>) => {
    const totalWeight = questionRatings.reduce((sum, q) => sum + q.weight, 0);
    const weightedSum = questionRatings.reduce((sum, q) => sum + (q.rating * q.weight), 0);
    return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
  }, []);

  // Update faculty feedback when ratings change
  const updateFacultyFeedback = useCallback((index: number, field: keyof IndividualFeedback, value: any) => {
    const currentFeedback = fields[index];
    if (!currentFeedback) return;

    let updatedFeedback = { ...currentFeedback };

    if (field === 'question_ratings') {
      updatedFeedback.question_ratings = value;
      const weightedScore = calculateWeightedScore(value);
      updatedFeedback.weighted_score = weightedScore;
      updatedFeedback.overall_rating = Math.round(weightedScore);
      
      // Update grade interpretation
      if (weightedScore >= 8) {
        updatedFeedback.grade_interpretation = 'Excellent';
      } else if (weightedScore >= 6) {
        updatedFeedback.grade_interpretation = 'Good';
      } else if (weightedScore >= 4) {
        updatedFeedback.grade_interpretation = 'Average';
      } else {
        updatedFeedback.grade_interpretation = 'Needs Improvement';
      }
    } else {
      updatedFeedback[field] = value;
    }

    update(index, updatedFeedback);
  }, [fields, update, calculateWeightedScore]);

  // Get completion percentage
  const getCompletionPercentage = useCallback(() => {
    const totalFields = fields.length * (questions.length + 3); // questions + overall_rating + detailed_feedback + suggestions
    let completedFields = 0;

    fields.forEach(feedback => {
      completedFields += feedback.question_ratings.filter(q => q.rating > 0).length;
      if (feedback.overall_rating > 0) completedFields++;
      if (feedback.detailed_feedback?.trim()) completedFields++;
      if (feedback.suggestions?.trim()) completedFields++;
    });

    return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
  }, [fields, questions.length]);

  // Handle form submission
  const handleSubmit = async (data: FeedbackSubmission) => {
    if (editingExpired) {
      toast({
        title: 'Submission Failed',
        description: 'The feedback editing window has expired.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await onSubmit(data);
      toast({
        title: 'Feedback Submitted',
        description: 'Your feedback has been submitted successfully.',
      });
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle partial submission
  const handlePartialSubmit = async () => {
    const data = form.getValues();
    if (data.faculty_feedbacks.length === 0) {
      toast({
        title: 'No Feedback to Submit',
        description: 'Please add at least one faculty feedback before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setShowConfirmation(true);
  };

  const completionPercentage = getCompletionPercentage();
  const canSubmit = fields.length > 0 && !editingExpired;
  const isFormDirty = form.formState.isDirty;

  return (
    <div className="space-y-6">
      {/* Header with progress and status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Faculty Feedback Form</span>
              </CardTitle>
              <CardDescription>
                Semester: {currentSemester} {currentAcademicYear} | Section: {studentSection}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {editingWindow && (
                <Badge variant={editingExpired ? 'destructive' : 'default'}>
                  <Clock className="h-3 w-3 mr-1" />
                  {editingExpired ? 'Expired' : 'Active'}
                </Badge>
              )}
              {draftLastSaved && (
                <Badge variant="outline">
                  <Save className="h-3 w-3 mr-1" />
                  Draft saved {draftLastSaved.toLocaleTimeString()}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Completion Progress</span>
              <span>{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Editing window warning */}
      {editingWindow && !editingExpired && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You can edit your feedback until {editingWindow.endDate.toLocaleString()}. 
            After this time, no changes will be allowed.
          </AlertDescription>
        </Alert>
      )}

      {/* Anonymity toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isAnonymous ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="text-sm font-medium">
                {isAnonymous ? 'Anonymous Feedback' : 'Identified Feedback'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAnonymous(!isAnonymous)}
            >
              {isAnonymous ? 'Make Identified' : 'Make Anonymous'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isAnonymous 
              ? 'Your identity will not be revealed to faculty members.'
              : 'Your identity may be visible to faculty members.'
            }
          </p>
        </CardContent>
      </Card>

      {/* Faculty selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Faculty to Evaluate</CardTitle>
          <CardDescription>
            Choose the faculty members you want to provide feedback for.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {facultyList
              .filter(faculty => faculty.sections.includes(studentSection))
              .map(faculty => {
                const isSelected = fields.some(f => f.faculty_id === faculty.id);
                return (
                  <Button
                    key={faculty.id}
                    variant={isSelected ? 'default' : 'outline'}
                    className="h-auto p-4 flex flex-col items-start space-y-2"
                    onClick={() => {
                      if (isSelected) {
                        const index = fields.findIndex(f => f.faculty_id === faculty.id);
                        removeFacultyFeedback(index);
                      } else {
                        addFacultyFeedback(faculty.id);
                      }
                    }}
                    disabled={editingExpired}
                  >
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{faculty.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {faculty.subjects.join(', ')}
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </Button>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Feedback forms */}
      {fields.length > 0 && (
        <Tabs defaultValue="0" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            {fields.map((_, index) => (
              <TabsTrigger key={index} value={index.toString()}>
                {fields[index].faculty_name}
              </TabsTrigger>
            ))}
          </TabsList>

          {fields.map((feedback, index) => (
            <TabsContent key={index} value={index.toString()} className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{feedback.faculty_name}</CardTitle>
                      <CardDescription>
                        Subject: {feedback.subject} | Overall Rating: {feedback.overall_rating}/10
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFacultyFeedback(index)}
                      disabled={editingExpired}
                    >
                      Remove
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Question ratings */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Question Ratings</h4>
                    {feedback.question_ratings.map((question, qIndex) => (
                      <div key={question.question_id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">
                            {question.question}
                          </label>
                          <span className="text-sm text-muted-foreground">
                            Weight: {question.weight}%
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">1</span>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={question.rating}
                            onChange={(e) => {
                              const newRatings = [...feedback.question_ratings];
                              newRatings[qIndex].rating = parseInt(e.target.value);
                              updateFacultyFeedback(index, 'question_ratings', newRatings);
                            }}
                            className="flex-1"
                            disabled={editingExpired}
                          />
                          <span className="text-sm">10</span>
                          <span className="text-sm font-medium w-8 text-center">
                            {question.rating}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Detailed feedback */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Detailed Feedback</label>
                    <textarea
                      value={feedback.detailed_feedback}
                      onChange={(e) => updateFacultyFeedback(index, 'detailed_feedback', e.target.value)}
                      placeholder="Provide detailed feedback about this faculty member..."
                      className="w-full min-h-[100px] p-3 border rounded-md resize-none"
                      disabled={editingExpired}
                    />
                  </div>

                  {/* Suggestions */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Suggestions for Improvement</label>
                    <textarea
                      value={feedback.suggestions}
                      onChange={(e) => updateFacultyFeedback(index, 'suggestions', e.target.value)}
                      placeholder="Any suggestions for improvement..."
                      className="w-full min-h-[80px] p-3 border rounded-md resize-none"
                      disabled={editingExpired}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Submission buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {isDraftSaving && 'Saving draft...'}
              {!isDraftSaving && isFormDirty && 'Draft will be saved automatically'}
              {!isDraftSaving && !isFormDirty && 'All changes saved'}
            </div>
            <div className="flex items-center space-x-2">
              {allowPartialSubmission && (
                <Button
                  variant="outline"
                  onClick={handlePartialSubmit}
                  disabled={!canSubmit || isSubmitting}
                >
                  Submit Partial Feedback
                </Button>
              )}
              <Button
                onClick={() => setShowConfirmation(true)}
                disabled={!canSubmit || isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? 'Submitting...' : 'Submit All Feedback'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <ConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={() => {
          form.handleSubmit(handleSubmit)();
          setShowConfirmation(false);
        }}
        title="Confirm Feedback Submission"
        description={`Are you sure you want to submit your feedback? This action cannot be undone.`}
        confirmText="Submit Feedback"
        isLoading={isSubmitting}
      />
    </div>
  );
}
