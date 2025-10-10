import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Eye, TrendingUp, Users, Star, BookOpen, Package } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { BundledFeedback, LegacyFeedbackData, FEEDBACK_QUESTIONS, Department, BatchYear, HODCreate } from "@/types/feedback";
import { apiService } from "@/services/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, Building, GraduationCap, UserPlus } from "lucide-react";
import ReportGenerator from "@/components/ReportGenerator";

const PrincipalDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [feedbackData, setFeedbackData] = useState<LegacyFeedbackData[]>([]);
  const [bundledFeedback, setBundledFeedback] = useState<BundledFeedback[]>([]);
  
  // Management state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batchYears, setBatchYears] = useState<BatchYear[]>([]);
  const [hods, setHODs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form states
  const [newDepartment, setNewDepartment] = useState({ name: '', code: '' });
  const [newBatchYear, setNewBatchYear] = useState({ year_range: '', department: '' });
  const [newHOD, setNewHOD] = useState<HODCreate>({ username: '', password: '', name: '', department: '' });
  const [newSections, setNewSections] = useState<string[]>([]);
  
  // Dialog states
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [isBatchYearDialogOpen, setIsBatchYearDialogOpen] = useState(false);
  const [isHODDialogOpen, setIsHODDialogOpen] = useState(false);
  const [isSectionsDialogOpen, setIsSectionsDialogOpen] = useState(false);
  const [selectedBatchYear, setSelectedBatchYear] = useState<string>('');

  useEffect(() => {
    // Check if user is logged in and is principal
    if (!user || user.role !== 'principal') {
      navigate('/admin-login');
      return;
    }

    // Load both legacy and bundled feedback data
    const legacyData = JSON.parse(localStorage.getItem('feedbackData') || '[]');
    const bundledData = JSON.parse(localStorage.getItem('bundledFeedbackData') || '[]');
    setFeedbackData(legacyData);
    setBundledFeedback(bundledData);
    
    // Load management data
    loadManagementData();
  }, [user, navigate]);

  const loadManagementData = async () => {
    try {
      setIsLoading(true);
      
      // Load departments
      const departmentsResponse = await apiService.getDepartments();
      if (departmentsResponse.success && departmentsResponse.data?.departments) {
        setDepartments(departmentsResponse.data.departments);
      }
      
      // Load batch years
      const batchYearsResponse = await apiService.getBatchYears();
      if (batchYearsResponse.success && batchYearsResponse.data?.batch_years) {
        setBatchYears(batchYearsResponse.data.batch_years);
      }
      
      // Load HODs
      const hodsResponse = await apiService.getHODs();
      if (hodsResponse.success && hodsResponse.data?.hods) {
        setHODs(hodsResponse.data.hods);
      }
    } catch (error) {
      console.error('Error loading management data:', error);
      toast.error('Failed to load management data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.info('Logged out successfully');
  };

  // Department management handlers
  const handleCreateDepartment = async () => {
    if (!newDepartment.name || !newDepartment.code) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      const response = await apiService.createDepartment(newDepartment);
      if (response.success) {
        toast.success('Department created successfully');
        setNewDepartment({ name: '', code: '' });
        setIsDepartmentDialogOpen(false);
        loadManagementData();
      } else {
        toast.error(response.message || 'Failed to create department');
      }
    } catch (error) {
      console.error('Error creating department:', error);
      toast.error('Failed to create department');
    }
  };

  // Batch year management handlers
  const handleCreateBatchYear = async () => {
    if (!newBatchYear.year_range || !newBatchYear.department) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      const response = await apiService.createBatchYear(newBatchYear);
      if (response.success) {
        toast.success('Batch year created successfully');
        setNewBatchYear({ year_range: '', department: '' });
        setIsBatchYearDialogOpen(false);
        loadManagementData();
      } else {
        toast.error(response.message || 'Failed to create batch year');
      }
    } catch (error) {
      console.error('Error creating batch year:', error);
      toast.error('Failed to create batch year');
    }
  };

  // HOD management handlers
  const handleCreateHOD = async () => {
    if (!newHOD.username || !newHOD.password || !newHOD.name || !newHOD.department) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      const response = await apiService.createHOD(newHOD);
      if (response.success) {
        toast.success('HOD created successfully');
        setNewHOD({ username: '', password: '', name: '', department: '' });
        setIsHODDialogOpen(false);
        loadManagementData();
      } else {
        toast.error(response.message || 'Failed to create HOD');
      }
    } catch (error) {
      console.error('Error creating HOD:', error);
      toast.error('Failed to create HOD');
    }
  };

  // Section management handlers
  const handleAddSections = async () => {
    if (!selectedBatchYear || newSections.length === 0) {
      toast.error('Please select batch year and add sections');
      return;
    }
    
    try {
      const response = await apiService.addSectionsToBatchYear(selectedBatchYear, newSections);
      if (response.success) {
        toast.success('Sections added successfully');
        setNewSections([]);
        setSelectedBatchYear('');
        setIsSectionsDialogOpen(false);
        loadManagementData();
      } else {
        toast.error(response.message || 'Failed to add sections');
      }
    } catch (error) {
      console.error('Error adding sections:', error);
      toast.error('Failed to add sections');
    }
  };

  const addSection = () => {
    const section = prompt('Enter section letter (A, B, C, D):');
    if (section && ['A', 'B', 'C', 'D'].includes(section.toUpperCase())) {
      const upperSection = section.toUpperCase();
      if (!newSections.includes(upperSection)) {
        setNewSections([...newSections, upperSection]);
      } else {
        toast.error('Section already added');
      }
    }
  };

  const removeSection = (section: string) => {
    setNewSections(newSections.filter(s => s !== section));
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
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="overview">Department Overview</TabsTrigger>
            <TabsTrigger value="students">Student Submissions</TabsTrigger>
            <TabsTrigger value="subjects">Subject Performance</TabsTrigger>
            <TabsTrigger value="faculty">Faculty Analysis</TabsTrigger>
            <TabsTrigger value="trends">Performance Trends</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="hods">HOD Management</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="batches">Batch Years</TabsTrigger>
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

          {/* Reports Tab */}
          <TabsContent value="reports">
            <ReportGenerator 
              userRole="principal" 
              onReportGenerated={loadManagementData}
            />
          </TabsContent>

          {/* HOD Management Tab */}
          <TabsContent value="hods">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    HOD Management
                  </CardTitle>
                  <CardDescription>Create and manage Head of Department accounts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">HOD Accounts</h3>
                    <Dialog open={isHODDialogOpen} onOpenChange={setIsHODDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add HOD
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New HOD Account</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="hod-username">Username</Label>
                              <Input
                                id="hod-username"
                                value={newHOD.username}
                                onChange={(e) => setNewHOD(prev => ({ ...prev, username: e.target.value }))}
                                placeholder="Enter username"
                              />
                            </div>
                            <div>
                              <Label htmlFor="hod-password">Password</Label>
                              <Input
                                id="hod-password"
                                type="password"
                                value={newHOD.password}
                                onChange={(e) => setNewHOD(prev => ({ ...prev, password: e.target.value }))}
                                placeholder="Enter password"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="hod-name">Full Name</Label>
                              <Input
                                id="hod-name"
                                value={newHOD.name}
                                onChange={(e) => setNewHOD(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Enter full name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="hod-department">Department</Label>
                              <Select value={newHOD.department} onValueChange={(value) => setNewHOD(prev => ({ ...prev, department: value }))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                  {departments.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.name}>
                                      {dept.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsHODDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateHOD}>
                            Create HOD
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hods.map((hod) => (
                          <TableRow key={hod.id}>
                            <TableCell>{hod.name}</TableCell>
                            <TableCell>{hod.username}</TableCell>
                            <TableCell>{hod.department}</TableCell>
                            <TableCell>
                              <Badge variant={hod.is_active ? 'default' : 'secondary'}>
                                {hod.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                  <Pencil className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Deactivate
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Department Management Tab */}
          <TabsContent value="departments">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Department Management
                  </CardTitle>
                  <CardDescription>Create and manage academic departments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Departments</h3>
                    <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Department
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Department</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="dept-name">Department Name</Label>
                            <Input
                              id="dept-name"
                              value={newDepartment.name}
                              onChange={(e) => setNewDepartment(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="e.g., Computer Science Engineering"
                            />
                          </div>
                          <div>
                            <Label htmlFor="dept-code">Department Code</Label>
                            <Input
                              id="dept-code"
                              value={newDepartment.code}
                              onChange={(e) => setNewDepartment(prev => ({ ...prev, code: e.target.value }))}
                              placeholder="e.g., CSE"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsDepartmentDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateDepartment}>
                            Create Department
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>HOD</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {departments.map((dept) => (
                          <TableRow key={dept.id}>
                            <TableCell>{dept.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{dept.code}</Badge>
                            </TableCell>
                            <TableCell>{dept.hod_name || 'Not Assigned'}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                  <Pencil className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Batch Year Management Tab */}
          <TabsContent value="batches">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Batch Year Management
                  </CardTitle>
                  <CardDescription>Create batch years and manage sections</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Create Batch Year */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Create Batch Year</h3>
                      <Dialog open={isBatchYearDialogOpen} onOpenChange={setIsBatchYearDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Batch Year
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create New Batch Year</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="batch-year">Year Range</Label>
                              <Input
                                id="batch-year"
                                value={newBatchYear.year_range}
                                onChange={(e) => setNewBatchYear(prev => ({ ...prev, year_range: e.target.value }))}
                                placeholder="e.g., 2024-2028"
                              />
                            </div>
                            <div>
                              <Label htmlFor="batch-dept">Department</Label>
                              <Select value={newBatchYear.department} onValueChange={(value) => setNewBatchYear(prev => ({ ...prev, department: value }))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                  {departments.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.name}>
                                      {dept.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsBatchYearDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleCreateBatchYear}>
                              Create Batch Year
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Add Sections */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Add Sections to Batch Year</h3>
                      <Dialog open={isSectionsDialogOpen} onOpenChange={setIsSectionsDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Manage Sections
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Sections to Batch Year</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="select-batch">Select Batch Year</Label>
                              <Select value={selectedBatchYear} onValueChange={setSelectedBatchYear}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select batch year" />
                                </SelectTrigger>
                                <SelectContent>
                                  {batchYears.map((batch) => (
                                    <SelectItem key={batch.id} value={batch.id}>
                                      {batch.year_range} {batch.department}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Sections</Label>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {newSections.map((section) => (
                                  <Badge key={section} variant="secondary" className="px-2 py-1">
                                    Section {section}
                                    <button 
                                      type="button" 
                                      className="ml-2 text-muted-foreground hover:text-foreground"
                                      onClick={() => removeSection(section)}
                                    >
                                      ×
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                              <Button variant="outline" onClick={addSection} className="w-full">
                                Add Section
                              </Button>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsSectionsDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleAddSections}>
                              Add Sections
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">Batch Years Overview</h3>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Year Range</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Sections</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {batchYears.map((batch) => (
                            <TableRow key={batch.id}>
                              <TableCell>{batch.year_range}</TableCell>
                              <TableCell>{batch.department}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {batch.sections?.map((section) => (
                                    <Badge key={section} variant="outline">
                                      {section}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm">
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button variant="destructive" size="sm">
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
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