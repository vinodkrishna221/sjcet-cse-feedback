import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LogOut, Download, BarChart3, Users, Star, TrendingUp, Package, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { BundledFeedback, LegacyFeedbackData } from "@/types/feedback";

const HODDashboard = () => {
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

  const handleExportData = () => {
    if (feedbackData.length === 0 && bundledFeedback.length === 0) {
      toast.error('No feedback data to export');
      return;
    }

    // Create CSV content for bundled feedback
    const headers = ['Student ID', 'Section', 'Teacher', 'Subject', 'Rating', 'Feedback', 'Suggestions', 'Submitted At'];
    const csvRows = [];
    
    // Add bundled feedback data
    bundledFeedback.forEach(bundle => {
      bundle.teacherFeedbacks.forEach(tf => {
        csvRows.push([
          bundle.studentName,
          bundle.studentSection,
          `"${tf.teacherName}"`,
          `"${tf.subject}"`,
          tf.rating,
          `"${tf.feedback.replace(/"/g, '""')}"`,
          `"${tf.suggestions.replace(/"/g, '""')}"`,
          bundle.submittedAt
        ].join(','));
      });
    });

    // Add legacy feedback data
    feedbackData.forEach(item => {
      csvRows.push([
        'Legacy Student',
        item.studentSection,
        `"${item.faculty}"`,
        `"${item.subject}"`,
        item.rating,
        `"${item.feedback.replace(/"/g, '""')}"`,
        `"${item.suggestions.replace(/"/g, '""')}"`,
        item.submittedAt
      ].join(','));
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('Feedback data exported successfully');
  };

  // Calculate comprehensive statistics
  const allFeedbackItems = [
    ...feedbackData,
    ...bundledFeedback.flatMap(bundle => 
      bundle.teacherFeedbacks.map(tf => ({
        id: bundle.id,
        subject: tf.subject,
        faculty: tf.teacherName,
        rating: tf.rating,
        feedback: tf.feedback,
        suggestions: tf.suggestions,
        submittedAt: bundle.submittedAt,
        studentSection: bundle.studentSection
      }))
    )
  ];

  const totalFeedback = allFeedbackItems.length;
  const totalBundles = bundledFeedback.length;
  const averageRating = totalFeedback > 0 
    ? (allFeedbackItems.reduce((sum, item) => sum + item.rating, 0) / totalFeedback).toFixed(1)
    : '0';
  
  const sectionA = allFeedbackItems.filter(item => item.studentSection === 'A').length;
  const sectionB = allFeedbackItems.filter(item => item.studentSection === 'B').length;

  const subjectStats = allFeedbackItems.reduce((acc, item) => {
    acc[item.subject] = (acc[item.subject] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const facultyRatings = allFeedbackItems.reduce((acc, item) => {
    if (!acc[item.faculty]) {
      acc[item.faculty] = { total: 0, count: 0 };
    }
    acc[item.faculty].total += item.rating;
    acc[item.faculty].count += 1;
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">HOD Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {user?.name}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleExportData}
              disabled={totalFeedback === 0}
              className="btn-academic"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-muted-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="card-academic">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalFeedback}</div>
              <p className="text-xs text-muted-foreground">Individual feedback items</p>
            </CardContent>
          </Card>

          <Card className="card-academic">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Student Bundles</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{totalBundles}</div>
              <p className="text-xs text-muted-foreground">Completed submissions</p>
            </CardContent>
          </Card>

          <Card className="card-academic">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{averageRating}/10</div>
            </CardContent>
          </Card>

          <Card className="card-academic">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Section A</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{sectionA}</div>
            </CardContent>
          </Card>

          <Card className="card-academic">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Section B</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{sectionB}</div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Reports */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bundles">Student Bundles</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="faculty">Faculty</TabsTrigger>
            <TabsTrigger value="feedback">All Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="card-academic">
                <CardHeader>
                  <CardTitle>Feedback Distribution</CardTitle>
                  <CardDescription>Responses by section</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Section A</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${totalFeedback > 0 ? (sectionA / totalFeedback) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{sectionA}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Section B</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-muted rounded-full h-2">
                          <div 
                            className="bg-accent h-2 rounded-full" 
                            style={{ width: `${totalFeedback > 0 ? (sectionB / totalFeedback) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{sectionB}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-academic">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Manage feedback data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={handleExportData}
                    disabled={totalFeedback === 0}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export All Data as CSV
                  </Button>
                  <Button 
                    onClick={() => toast.info('Feature coming soon!')}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Generate Analytics Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="subjects">
            <Card className="card-academic">
              <CardHeader>
                <CardTitle>Subject-wise Feedback</CardTitle>
                <CardDescription>Number of responses per subject</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(subjectStats).map(([subject, count]) => (
                    <div key={subject} className="flex items-center justify-between">
                      <span className="font-medium">{subject}</span>
                      <Badge variant="secondary">{count} responses</Badge>
                    </div>
                  ))}
                  {Object.keys(subjectStats).length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No feedback data available yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faculty">
            <Card className="card-academic">
              <CardHeader>
                <CardTitle>Faculty Ratings</CardTitle>
                <CardDescription>Average ratings per faculty member</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(facultyRatings).map(([faculty, stats]) => {
                    const avgRating = (stats.total / stats.count).toFixed(1);
                    return (
                      <div key={faculty} className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{faculty}</span>
                          <p className="text-sm text-muted-foreground">{stats.count} responses</p>
                        </div>
                        <Badge variant={Number(avgRating) >= 7 ? "default" : "secondary"}>
                          {avgRating}/10
                        </Badge>
                      </div>
                    );
                  })}
                  {Object.keys(facultyRatings).length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No faculty ratings available yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bundles">
            <Card className="card-academic">
              <CardHeader>
                <CardTitle>Student Feedback Bundles</CardTitle>
                <CardDescription>Complete feedback submissions from students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bundledFeedback.map((bundle) => (
                    <Collapsible key={bundle.id}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between w-full">
                          <div className="flex items-center space-x-3">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <h4 className="font-medium text-left">{bundle.studentName}</h4>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <span>Section {bundle.studentSection}</span>
                                <span>•</span>
                                <span>{bundle.teacherFeedbacks.length} teachers</span>
                                <span>•</span>
                                <span>{new Date(bundle.submittedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="grid gap-3 px-4 pb-4">
                          {bundle.teacherFeedbacks.map((tf, index) => (
                            <div key={index} className="bg-muted/30 rounded p-3">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-sm">{tf.teacherName} - {tf.subject}</h5>
                                <Badge variant="outline">Rating: {tf.rating}/10</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                <strong>Feedback:</strong> {tf.feedback}
                              </p>
                              {tf.suggestions && (
                                <p className="text-sm text-muted-foreground">
                                  <strong>Suggestions:</strong> {tf.suggestions}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                  {bundledFeedback.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No bundled feedback submissions yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback">
            <Card className="card-academic">
              <CardHeader>
                <CardTitle>All Feedback Items</CardTitle>
                <CardDescription>Individual feedback responses from all submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allFeedbackItems.slice(0, 15).map((item, index) => (
                    <div key={`${item.id}-${index}`} className="border-b border-border pb-4 last:border-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{item.subject} - {item.faculty}</h4>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span>Section {item.studentSection}</span>
                            <span>•</span>
                            <span>Rating: {item.rating}/10</span>
                            <span>•</span>
                            <span>{new Date(item.submittedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.feedback.length > 150 ? `${item.feedback.substring(0, 150)}...` : item.feedback}
                      </p>
                    </div>
                  ))}
                  {allFeedbackItems.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No feedback submissions yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default HODDashboard;