import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Teacher, IndividualFeedback } from "@/types/feedback";
import { Star } from "lucide-react";

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
  const [rating, setRating] = useState([existingFeedback?.rating || 7]);
  const [feedback, setFeedback] = useState(existingFeedback?.feedback || '');
  const [suggestions, setSuggestions] = useState(existingFeedback?.suggestions || '');

  const handleSave = () => {
    if (!feedback.trim() || feedback.length < 20) {
      return; // Validation handled by disabled state
    }

    const feedbackData: IndividualFeedback = {
      teacherId: teacher.id,
      teacherName: teacher.name,
      subject: teacher.subject,
      rating: rating[0],
      feedback: feedback.trim(),
      suggestions: suggestions.trim()
    };

    onSave(feedbackData);
    onClose();
  };

  const handleClose = () => {
    // Reset form when closing without saving
    setRating([existingFeedback?.rating || 7]);
    setFeedback(existingFeedback?.feedback || '');
    setSuggestions(existingFeedback?.suggestions || '');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Feedback for {teacher.name}
          </DialogTitle>
          <p className="text-muted-foreground">
            Subject: {teacher.subject}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rating */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Overall Rating: {rating[0]}/10
            </Label>
            <div className="px-3">
              <Slider
                value={rating}
                onValueChange={setRating}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1 - Poor</span>
              <span>5 - Average</span>
              <span>10 - Excellent</span>
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-2">
            <Label htmlFor="feedback" className="text-base font-medium">
              Detailed Feedback <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="feedback"
              placeholder={`Share your experience with ${teacher.name}'s teaching methodology, course content, classroom management, etc.`}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 20 characters required ({feedback.length}/20)
            </p>
          </div>

          {/* Suggestions */}
          <div className="space-y-2">
            <Label htmlFor="suggestions" className="text-base font-medium">
              Suggestions for Improvement
            </Label>
            <Textarea
              id="suggestions"
              placeholder="Any suggestions to improve the teaching methods or course delivery?"
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!feedback.trim() || feedback.length < 20}
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