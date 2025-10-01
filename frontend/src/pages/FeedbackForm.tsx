import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Send, Star, CircleCheck as CheckCircle2, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import TeacherFeedbackModal from "@/components/TeacherFeedbackModal";
import { Teacher, IndividualFeedback, BundledFeedback } from "@/types/feedback";
import { useTeachers } from "@/hooks/useTeachers";
import { apiService } from "@/services/api";

const FeedbackForm = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherFeedbacks, setTeacherFeedbacks] = useState<Record<string, IndividualFeedback>>({});
  
  // Use the custom hook to fetch teachers from the backend
  const { teachers: sectionTeachers, loading: teachersLoading, error: teachersError } = useTeachers(user?.section);

  const handleTeacherFeedbackSave = (feedback: IndividualFeedback) => {
    setTeacherFeedbacks(prev => ({
      ...prev,
      [feedback.teacherId]: feedback
    }));
    toast.success(`Comprehensive feedback saved for ${feedback.teacherName} (${feedback.overallRating}/10)`);
  };

  const handleSubmitAllFeedback = async () => {
    const feedbackCount = Object.keys(teacherFeedbacks).length;
    
    if (feedbackCount === 0) {
      toast.error('Please provide feedback for at least one teacher');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare feedback data for backend schema (FeedbackCreate)
      const toFiveScale = (value: number) => {
        // Convert 1-10 scale to 1-5 (rounded to nearest integer within bounds)
        const converted = Math.round(value / 2);
        return Math.min(5, Math.max(1, converted));
      };

      const feedbackData = {
        student_section: user?.section,
        faculty_feedbacks: Object.values(teacherFeedbacks).map(tf => ({
          faculty_id: tf.teacherId,
          faculty_name: tf.teacherName,
          subject: tf.subject,
          question_ratings: tf.questionRatings.map(qr => ({
            question_id: qr.questionId,
            question: qr.question,
            rating: toFiveScale(qr.rating)
          })),
          overall_rating: parseFloat((tf.overallRating / 2).toFixed(1)),
          detailed_feedback: (tf as any).detailedFeedback || '',
          suggestions: tf.suggestions || ''
        }))
      } as const;

      const response = await apiService.submitFeedback(feedbackData);
      
      if (response.success) {
        toast.success(`Feedback submitted successfully for ${feedbackCount} teachers!`);
        
        // Navigate to success page or logout after a delay
        setTimeout(() => {
          logout();
          navigate('/');
        }, 2000);
      } else {
        throw new Error(response.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.info('Logged out successfully');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Feedback Form</h1>
            <p className="text-sm text-muted-foreground">
              Welcome, {user?.name} | Section {user?.section}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="text-muted-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="card-academic">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Teacher Feedback</CardTitle>
            <p className="text-muted-foreground text-center">
              Provide feedback for all your teachers. Your responses help improve teaching quality and remain anonymous.
            </p>
          </CardHeader>
          <CardContent>
            {/* Progress Summary */}
            <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-primary" />
                  <span className="font-medium">Feedback Progress</span>
                </div>
                <Badge variant="secondary">
                  {Object.keys(teacherFeedbacks).length} of {sectionTeachers.length} completed
                </Badge>
              </div>
              {teachersLoading && (
                <p className="text-sm text-muted-foreground mt-2">Loading teachers...</p>
              )}
              {teachersError && (
                <p className="text-sm text-destructive mt-2">Error loading teachers: {teachersError}</p>
              )}
            </div>

            {/* Teachers List */}
            <div className="space-y-4 mb-8">
              <h3 className="text-lg font-semibold">Your Teachers - Section {user?.section}</h3>
              {teachersLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading teachers...</p>
                </div>
              ) : teachersError ? (
                <div className="text-center py-8">
                  <p className="text-destructive">Failed to load teachers: {teachersError}</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {sectionTeachers.map((teacher) => {
                    const hasFeedback = !!teacherFeedbacks[teacher.id];
                    
                    return (
                      <div 
                        key={teacher.id} 
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div>
                              <h4 className="font-medium">{teacher.name}</h4>
                              <p className="text-sm text-muted-foreground">{teacher.subject}</p>
                              {hasFeedback && (
                                <p className="text-xs text-primary">
                                  {teacherFeedbacks[teacher.id].questionRatings.length} questions rated
                                </p>
                              )}
                            </div>
                            {hasFeedback && (
                              <CheckCircle2 className="h-5 w-5 text-success" />
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {hasFeedback && (
                            <Badge variant="outline" className="text-success border-success">
                              Overall: {teacherFeedbacks[teacher.id].overallRating}/10
                            </Badge>
                          )}
                          <Button
                            variant={hasFeedback ? "outline" : "default"}
                            onClick={() => setSelectedTeacher(teacher)}
                            className={hasFeedback ? "border-success text-success hover:bg-success/10" : "btn-academic"}
                          >
                            {hasFeedback ? 'Edit Feedback' : 'Give Feedback'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submit All Button */}
            <div className="pt-4 border-t border-border">
              <Button
                onClick={handleSubmitAllFeedback}
                disabled={isSubmitting || Object.keys(teacherFeedbacks).length === 0}
                className="w-full btn-hero text-lg py-6"
              >
                {isSubmitting ? (
                  'Submitting All Feedback...'
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Submit All Feedback
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                You can submit feedback for individual teachers and submit all at once
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Teacher Feedback Modal */}
        {selectedTeacher && (
          <TeacherFeedbackModal
            teacher={selectedTeacher}
            isOpen={!!selectedTeacher}
            onClose={() => setSelectedTeacher(null)}
            onSave={handleTeacherFeedbackSave}
            existingFeedback={teacherFeedbacks[selectedTeacher.id]}
          />
        )}

        {/* Privacy Note */}
        <div className="mt-6 p-4 bg-success/10 rounded-lg border border-success/20">
          <div className="flex items-start space-x-3">
            <Star className="h-5 w-5 text-success mt-0.5" />
            <div>
              <h4 className="font-medium text-success mb-1">Anonymous Feedback</h4>
              <p className="text-sm text-success/80">
                Your identity remains completely anonymous. The feedback will only include your section 
                information to help with analysis, but not your personal details.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FeedbackForm;