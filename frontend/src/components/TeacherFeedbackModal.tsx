import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Teacher, IndividualFeedback, FEEDBACK_QUESTIONS, QuestionRating, calculateWeightedScore } from "@/types/feedback";
import { Star, MessageSquare, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface TeacherFeedbackModalProps {
  teacher: Teacher;
  isOpen: boolean;
  onClose: () => void;
  onSave: (feedback: IndividualFeedback) => void;
  existingFeedback?: IndividualFeedback;
}

const TeacherFeedbackModal = ({ 
  teacher, 
  isOpen, 
  onClose, 
  onSave, 
  existingFeedback 
}: TeacherFeedbackModalProps) => {
  const [questionRatings, setQuestionRatings] = useState<QuestionRating[]>(
    existingFeedback?.questionRatings || 
    FEEDBACK_QUESTIONS.map(q => ({ questionId: q.id, question: q.question, rating: 7, weight: q.weight }))
  );
  const [detailedFeedback, setDetailedFeedback] = useState(existingFeedback?.detailedFeedback || '');
  const [suggestions, setSuggestions] = useState(existingFeedback?.suggestions || '');

  const handleQuestionRatingChange = (questionId: string, rating: number[]) => {
    setQuestionRatings(prev => 
      prev.map(qr => 
        qr.questionId === questionId 
          ? { ...qr, rating: rating[0] }
          : qr
      )
    );
  };

  const calculateOverallRating = () => {
    const total = questionRatings.reduce((sum, qr) => sum + qr.rating, 0);
    return Math.round(total / questionRatings.length * 10) / 10;
  };

  const calculateWeightedScoreAndGrade = () => {
    return calculateWeightedScore(questionRatings);
  };

  const handleSave = () => {
    if (!suggestions.trim() || suggestions.length < 10) {
      toast.error('Please provide suggestions (minimum 10 characters)');
      return;
    }

    // Validate all questions are rated
    const unratedQuestions = questionRatings.filter(qr => qr.rating < 1 || qr.rating > 10);
    if (unratedQuestions.length > 0) {
      toast.error('Please rate all questions');
      return;
    }

    const { score, grade } = calculateWeightedScoreAndGrade();
    
    const feedbackData: IndividualFeedback = {
      teacherId: teacher.id,
      teacherName: teacher.name,
      subject: teacher.subject,
      questionRatings,
      overallRating: calculateOverallRating(),
      weightedScore: score,
      gradeInterpretation: grade,
      detailedFeedback: detailedFeedback.trim() || undefined,
      suggestions: suggestions.trim()
    };

    onSave(feedbackData);
    onClose();
  };

  const handleClose = () => {
    // Reset form when closing without saving
    setQuestionRatings(
      existingFeedback?.questionRatings || 
      FEEDBACK_QUESTIONS.map(q => ({ questionId: q.id, question: q.question, rating: 7 }))
    );
    setDetailedFeedback(existingFeedback?.detailedFeedback || '');
    setSuggestions(existingFeedback?.suggestions || '');
    onClose();
  };

  const overallRating = calculateOverallRating();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center space-x-2">
            <Star className="h-5 w-5 text-primary" />
            <span>Feedback for {teacher.name}</span>
          </DialogTitle>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Subject: {teacher.subject}</span>
            <Badge variant="outline">Overall: {overallRating}/10</Badge>
            <Badge variant="secondary">Weighted: {calculateWeightedScoreAndGrade().score.toFixed(1)}%</Badge>
            <Badge variant={calculateWeightedScoreAndGrade().grade === 'Excellent' ? 'default' : 
                           calculateWeightedScoreAndGrade().grade === 'Very Good' ? 'secondary' : 
                           calculateWeightedScoreAndGrade().grade === 'Good' ? 'outline' : 'destructive'}>
              {calculateWeightedScoreAndGrade().grade}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Question Ratings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Star className="h-5 w-5" />
                <span>Rate Each Aspect (1-10)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {FEEDBACK_QUESTIONS.map((question, index) => {
                const currentRating = questionRatings.find(qr => qr.questionId === question.id)?.rating || 7;
                
                return (
                  <div key={question.id} className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">
                          {index + 1}. {question.question}
                        </Label>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {question.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Weight: {question.weight}%
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-semibold text-primary">
                          {currentRating}/10
                        </span>
                      </div>
                    </div>
                    
                    <div className="px-3">
                      <Slider
                        value={[currentRating]}
                        onValueChange={(value) => handleQuestionRatingChange(question.id, value)}
                        max={10}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 - Poor</span>
                      <span>5 - Average</span>
                      <span>10 - Excellent</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Overall Rating Display */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center space-x-6">
                  <div>
                    <div className="text-3xl font-bold text-primary mb-2">
                      {overallRating}/10
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Overall Rating
                    </p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {calculateWeightedScoreAndGrade().score.toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Weighted Score
                    </p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <Badge variant={calculateWeightedScoreAndGrade().grade === 'Excellent' ? 'default' : 
                                 calculateWeightedScoreAndGrade().grade === 'Very Good' ? 'secondary' : 
                                 calculateWeightedScoreAndGrade().grade === 'Good' ? 'outline' : 'destructive'}
                         className="text-lg px-4 py-2">
                    {calculateWeightedScoreAndGrade().grade}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Feedback (Optional) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Detailed Feedback</span>
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={`Share your detailed experience with ${teacher.name}'s teaching methods, course delivery, classroom interaction, etc. This is optional but helps provide more context.`}
                value={detailedFeedback}
                onChange={(e) => setDetailedFeedback(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Optional: Provide additional context about your learning experience
              </p>
            </CardContent>
          </Card>

          {/* Suggestions for Improvement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>Suggestions for Improvement</span>
                <Badge variant="destructive" className="text-xs">Required</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="What specific suggestions do you have to help improve the teaching methods, course delivery, or overall learning experience?"
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Required: Minimum 10 characters ({suggestions.length}/10)
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!suggestions.trim() || suggestions.length < 10}
              className="btn-hero"
            >
              <Star className="h-4 w-4 mr-2" />
              Save Feedback
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherFeedbackModal;