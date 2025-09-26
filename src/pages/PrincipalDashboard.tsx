import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Eye, TrendingUp, Users, Star, BookOpen, Package } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { BundledFeedback, LegacyFeedbackData, FEEDBACK_QUESTIONS } from "@/types/feedback";

const PrincipalDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [feedbackData, setFeedbackData] = useState<LegacyFeedbackData[]>([]);
  const [bundledFeedback, setBundledFeedback] = useState<BundledFeedback[]>([]);

  useEffect(() => {
    // Load both legacy and bundled feedback data
    const legacyData = JSON.parse(localStorage.getItem('feedbackData') || '[]');
    const bundledData = JSON.parse(localStorage.getItem('bundledFeedbackData') || '[]');
    setFeedbackData(legacyData);
    setBundledFeedback(bundledData);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.info('Logged out successfully');
  };

  // Calculate comprehensive statistics combining both data sources
  const allFeedbackItems = [
    ...feedbackData,
    ...bundledFeedback.flatMap(bundle => 
      bundle.teacherFeedbacks.map(tf => ({
        id: bundle.id,
        subject: tf.subject,
        faculty: tf.teacherName,
        rating: tf.overallRating,
        feedback: tf.detailedFeedback || '',
        suggestions: tf.suggestions,
        submittedAt: bundle.submittedAt,
        studentSection: bundle.studentSection
      }))
    )
  ];

  const totalFeedback = allFeedbackItems.length;
  const totalStudents = bundledFeedback.length + feedbackData.length; // Approximate unique students
  const averageRating = totalFeedback > 0 
    ? (allFeedbackItems.reduce((sum, item) => sum + item.rating, 0) / totalFeedback).toFixed(1)
    : '0';
  
  const sectionA = allFeedbackItems.filter(item => item.studentSection === 'A').length;
  const sectionB = allFeedbackItems.filter(item => item.studentSection === 'B').length;

  // Subject performance analysis
  const subjectPerformance = allFeedbackItems.reduce((acc, item) => {
    if (!acc[item.subject]) {
      acc[item.subject] = { total: 0, count: 0, ratings: [] };
    }
    acc[item.subject].total += item.rating;
    acc[item.subject].count += 1;
    acc[item.subject].ratings.push(item.rating);
    return acc;
  }, {} as Record<string, { total: number; count: number; ratings: number[] }>);

  // Faculty performance analysis
  const facultyPerformance = allFeedbackItems.reduce((acc, item) => {
    if (!acc[item.faculty]) {
      acc[item.faculty] = { total: 0, count: 0, ratings: [], subjects: new Set() };
    }
    acc[item.faculty].total += item.rating;
    acc[item.faculty].count += 1;
    acc[item.faculty].ratings.push(item.rating);
    acc[item.faculty].subjects.add(item.subject);
    return acc;
  }, {} as Record<string, { total: number; count: number; ratings: number[]; subjects: Set<string> }>);

  // Department performance metrics
  const excellentRatings = allFeedbackItems.filter(item => item.rating >= 8).length;
  const averageRatings = allFeedbackItems.filter(item => item.rating >= 6 && item.rating < 8).length;
  const poorRatings = allFeedbackItems.filter(item => item.rating < 6).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Principal Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome, {user?.name} | CSE Department Overview
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
      <main className="container mx-auto px-4 py-8">
        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="card-academic">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalFeedback}</div>
              <p className="text-xs text-muted-foreground">Individual feedback items</p>
            </CardContent>
          </Card>

          <Card className="card-academic">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{bundledFeedback.length}</div>
              <p className="text-xs text-muted-foreground">Completed submissions</p>
            </CardContent>
          </Card>

          <Card className="card-academic">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dept. Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{averageRating}/10</div>
              <p className="text-xs text-muted-foreground">Overall department average</p>
            </CardContent>
          </Card>

          <Card className="card-academic">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Excellence Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {totalFeedback > 0 ? Math.round((excellentRatings / totalFeedback) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Ratings 8+ out of 10</p>
            </CardContent>
          </Card>

          <Card className="card-academic">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subjects Covered</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {Object.keys(subjectPerformance).length}
              </div>
              <p className="text-xs text-muted-foreground">Different subjects reviewed</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Department Overview</TabsTrigger>
            <TabsTrigger value="students">Student Submissions</TabsTrigger>
            <TabsTrigger value="subjects">Subject Performance</TabsTrigger>
            <TabsTrigger value="faculty">Faculty Analysis</TabsTrigger>
            <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="card-academic">
                <CardHeader>
                  <CardTitle>Performance Distribution</CardTitle>
                  <CardDescription>Rating categories breakdown</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-success">Excellent (8-10)</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-muted rounded-full h-3">
                        <div 
                          className="bg-success h-3 rounded-full" 
                          style={{ width: `${totalFeedback > 0 ? (excellentRatings / totalFeedback) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{excellentRatings}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-warning">Good (6-7)</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-muted rounded-full h-3">
                        <div 
                          className="bg-warning h-3 rounded-full" 
                          style={{ width: `${totalFeedback > 0 ? (averageRatings / totalFeedback) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{averageRatings}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-destructive">Needs Improvement (1-5)</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-muted rounded-full h-3">
                        <div 
                          className="bg-destructive h-3 rounded-full" 
                          style={{ width: `${totalFeedback > 0 ? (poorRatings / totalFeedback) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{poorRatings}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-academic">
                <CardHeader>
                  <CardTitle>Section Participation</CardTitle>
                  <CardDescription>Student response rates by section</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Section A</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-muted rounded-full h-3">
                        <div 
                          className="bg-primary h-3 rounded-full" 
                          style={{ width: `${totalFeedback > 0 ? (sectionA / totalFeedback) * 100 : 0}%` }}
                        />
                      </div>
                      <Badge variant="secondary">{sectionA} responses</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Section B</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-muted rounded-full h-3">
                        <div 
                          className="bg-accent h-3 rounded-full" 
                          style={{ width: `${totalFeedback > 0 ? (sectionB / totalFeedback) * 100 : 0}%` }}
                        />
                      </div>
                      <Badge variant="secondary">{sectionB} responses</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="students">
            <Card className="card-academic">
              <CardHeader>
                <CardTitle>Student Feedback Submissions</CardTitle>
                <CardDescription>Comprehensive 10-question feedback from students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {bundledFeedback.map((bundle) => (
                    <div key={bundle.id} className="border border-border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-medium flex items-center space-x-2">
                            <Package className="h-4 w-4" />
                            <span>{bundle.studentName}</span>
                          </h4>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span>Section {bundle.studentSection}</span>
                            <span>•</span>
                            <span>{bundle.teacherFeedbacks.length} teachers evaluated</span>
                            <span>•</span>
                            <span>{new Date(bundle.submittedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Badge variant="outline">
                          Avg: {(bundle.teacherFeedbacks.reduce((sum, tf) => sum + tf.overallRating, 0) / bundle.teacherFeedbacks.length).toFixed(1)}/10
                        </Badge>
                      </div>
                      
                      <div className="space-y-4">
                        {bundle.teacherFeedbacks.map((tf, index) => (
                          <div key={index} className="bg-muted/20 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h5 className="font-medium">{tf.teacherName}</h5>
                                <p className="text-sm text-muted-foreground">{tf.subject}</p>
                              </div>
                              <Badge variant="secondary">
                                {tf.overallRating}/10
                              </Badge>
                            </div>
                            
                            {/* Question Categories Performance */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                              {tf.questionRatings.slice(0, 5).map((qr, qIndex) => (
                                <div key={qIndex} className="text-xs">
                                  <div className="font-medium truncate">
                                    {FEEDBACK_QUESTIONS.find(q => q.id === qr.questionId)?.category}
                                  </div>
                                  <div className="text-primary font-semibold">{qr.rating}/10</div>
                                </div>
                              ))}
                            </div>
                            
                            {/* Detailed Feedback */}
                            {tf.detailedFeedback && (
                              <div className="mb-2">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Detailed Feedback:</p>
                                <p className="text-sm bg-background rounded p-2">{tf.detailedFeedback}</p>
                              </div>
                            )}
                            
                            {/* Suggestions */}
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Suggestions:</p>
                              <p className="text-sm bg-background rounded p-2">{tf.suggestions}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {bundledFeedback.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No student submissions yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subjects">
            <Card className="card-academic">
              <CardHeader>
                <CardTitle>Subject Performance Analysis</CardTitle>
                <CardDescription>Comprehensive analysis with question-wise breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(subjectPerformance)
                    .sort(([,a], [,b]) => (b.total / b.count) - (a.total / a.count))
                    .map(([subject, stats]) => {
                      const avgRating = (stats.total / stats.count).toFixed(1);
                      const ratingColor = Number(avgRating) >= 8 ? 'success' : Number(avgRating) >= 6 ? 'warning' : 'destructive';
                      
                      return (
                        <div key={subject} className="p-4 border border-border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{subject}</h4>
                              <p className="text-sm text-muted-foreground">{stats.count} comprehensive evaluations</p>
                            </div>
                            <Badge variant={ratingColor === 'success' ? 'default' : 'secondary'}>
                              {avgRating}/10
                            </Badge>
                          </div>
                          
                          {/* Question Categories Performance for this subject */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {FEEDBACK_QUESTIONS.slice(0, 5).map((question, qIndex) => (
                              <div key={qIndex} className="text-xs p-2 bg-muted/20 rounded">
                                <div className="font-medium truncate">{question.category}</div>
                                <div className="text-primary">Avg Rating</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  {Object.keys(subjectPerformance).length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No subject data available yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faculty">
            <Card className="card-academic">
              <CardHeader>
                <CardTitle>Faculty Performance Summary</CardTitle>
                <CardDescription>10-question analysis for teaching effectiveness</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(facultyPerformance)
                    .sort(([,a], [,b]) => (b.total / b.count) - (a.total / a.count))
                    .map(([faculty, stats]) => {
                      const avgRating = (stats.total / stats.count).toFixed(1);
                      const subjectCount = stats.subjects.size;
                      
                      return (
                        <div key={faculty} className="p-4 border border-border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{faculty}</h4>
                            <p className="text-sm text-muted-foreground">
                              {stats.count} comprehensive evaluations • {subjectCount} subject{subjectCount > 1 ? 's' : ''}
                            </p>
                          </div>
                          <Badge variant={Number(avgRating) >= 7 ? 'default' : 'secondary'}>
                            {avgRating}/10
                          </Badge>
                          </div>
                          
                          {/* Teaching aspects breakdown */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {FEEDBACK_QUESTIONS.slice(0, 5).map((question, qIndex) => (
                              <div key={qIndex} className="text-xs p-2 bg-muted/20 rounded">
                                <div className="font-medium truncate">{question.category}</div>
                                <div className="text-primary">Performance</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  {Object.keys(facultyPerformance).length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No faculty data available yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faculty">
            <Card className="card-academic">
              <CardHeader>
                <CardTitle>Faculty Performance Summary</CardTitle>
                <CardDescription>Teaching effectiveness based on student feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(facultyPerformance)
                    .sort(([,a], [,b]) => (b.total / b.count) - (a.total / a.count))
                    .map(([faculty, stats]) => {
                      const avgRating = (stats.total / stats.count).toFixed(1);
                      const subjectCount = stats.subjects.size;
                      
                      return (
                        <div key={faculty} className="flex items-center justify-between p-4 border border-border rounded-lg">
                          <div>
                            <h4 className="font-medium">{faculty}</h4>
                            <p className="text-sm text-muted-foreground">
                              {stats.count} responses • {subjectCount} subject{subjectCount > 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge variant={Number(avgRating) >= 7 ? 'default' : 'secondary'}>
                              {avgRating}/10
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  {Object.keys(facultyPerformance).length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No faculty data available yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="card-academic">
                <CardHeader>
                  <CardTitle>Department Insights</CardTitle>
                  <CardDescription>Comprehensive teaching effectiveness metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center p-6 bg-success/5 rounded-lg border border-success/20">
                    <div className="text-2xl font-bold text-success mb-2">
                      {totalFeedback > 0 ? Math.round((excellentRatings / totalFeedback) * 100) : 0}%
                    </div>
                    <p className="text-sm text-success/80">Excellence Rate</p>
                    <p className="text-xs text-muted-foreground mt-1">Overall ratings 8+ out of 10</p>
                  </div>
                  
                  <div className="text-center p-6 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="text-2xl font-bold text-primary mb-2">{averageRating}</div>
                    <p className="text-sm text-primary/80">Department Average</p>
                    <p className="text-xs text-muted-foreground mt-1">Across all 10 evaluation criteria</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-academic">
                <CardHeader>
                  <CardTitle>Participation Summary</CardTitle>
                  <CardDescription>Student engagement metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Student Participation</span>
                    <Badge variant="outline">{totalFeedback} comprehensive evaluations</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Section A Participation</span>
                    <Badge variant="outline">{sectionA} students</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Section B Participation</span>
                    <Badge variant="outline">{sectionB} students</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Subjects Evaluated</span>
                    <Badge variant="outline">{Object.keys(subjectPerformance).length} subjects</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Faculty Members Reviewed</span>
                    <Badge variant="outline">{Object.keys(facultyPerformance).length} faculty</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Evaluation Criteria</span>
                    <Badge variant="outline">{FEEDBACK_QUESTIONS.length} questions</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PrincipalDashboard;