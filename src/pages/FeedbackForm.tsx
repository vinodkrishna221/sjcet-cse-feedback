import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { LogOut, Send, Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const FeedbackForm = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [subject, setSubject] = useState('');
  const [faculty, setFaculty] = useState('');
  const [rating, setRating] = useState([7]);
  const [feedback, setFeedback] = useState('');
  const [suggestions, setSuggestions] = useState('');

  const subjects = [
    'Data Structures',
    'Computer Networks',
    'Operating Systems',
    'Database Management Systems',
    'Software Engineering',
    'Web Technologies'
  ];

  const faculties = [
    'Dr. A. Kumar',
    'Prof. B. Sharma',
    'Dr. C. Patel',
    'Prof. D. Singh',
    'Dr. E. Reddy',
    'Prof. F. Gupta'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject || !faculty || !feedback.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    // Simulate submission
    setTimeout(() => {
      const feedbackData = {
        id: Math.random().toString(36).substr(2, 9),
        subject,
        faculty,
        rating: rating[0],
        feedback: feedback.trim(),
        suggestions: suggestions.trim(),
        submittedAt: new Date().toISOString(),
        studentSection: user?.section
      };

      // Store in localStorage for demo (in real app, would send to Supabase)
      const existingFeedback = JSON.parse(localStorage.getItem('feedbackData') || '[]');
      existingFeedback.push(feedbackData);
      localStorage.setItem('feedbackData', JSON.stringify(existingFeedback));

      toast.success('Feedback submitted successfully!');
      
      // Reset form
      setSubject('');
      setFaculty('');
      setRating([7]);
      setFeedback('');
      setSuggestions('');
      setIsSubmitting(false);

      // Navigate to success page or logout
      setTimeout(() => {
        logout();
        navigate('/');
      }, 2000);
    }, 1500);
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
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="card-academic">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Subject Feedback</CardTitle>
            <p className="text-muted-foreground text-center">
              Your feedback helps us improve the quality of education. All responses are anonymous.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Subject Selection */}
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-base font-medium">
                  Subject <span className="text-destructive">*</span>
                </Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject for feedback" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subj) => (
                      <SelectItem key={subj} value={subj}>
                        {subj}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Faculty Selection */}
              <div className="space-y-2">
                <Label htmlFor="faculty" className="text-base font-medium">
                  Faculty <span className="text-destructive">*</span>
                </Label>
                <Select value={faculty} onValueChange={setFaculty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select faculty member" />
                  </SelectTrigger>
                  <SelectContent>
                    {faculties.map((fac) => (
                      <SelectItem key={fac} value={fac}>
                        {fac}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                  placeholder="Share your experience with the subject, teaching methodology, course content, etc."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 20 characters required
                </p>
              </div>

              {/* Suggestions */}
              <div className="space-y-2">
                <Label htmlFor="suggestions" className="text-base font-medium">
                  Suggestions for Improvement
                </Label>
                <Textarea
                  id="suggestions"
                  placeholder="Any suggestions to improve the course or teaching methods?"
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || !subject || !faculty || feedback.length < 20}
                  className="w-full btn-hero text-lg py-6"
                >
                  {isSubmitting ? (
                    'Submitting Feedback...'
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Submit Feedback
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

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