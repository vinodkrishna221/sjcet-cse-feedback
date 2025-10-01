import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogOut, Eye, TrendingUp, Users, Star, BookOpen, Package, Upload, Download, CircleAlert as AlertCircle } from "lucide-react";
import { FiUserPlus } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { apiService } from "@/services/api";
import { toast } from "sonner";
import Papa from 'papaparse';
import { BundledFeedback as SubmissionBundle } from "@/types/feedback";

// Backend-compatible interfaces based on models.py
interface StudentDetails {
  id: string;
  reg_number: string;
  name: string;
  section: 'A' | 'B';
  dob: string;
  email?: string;
  phone?: string;
  year?: string;
  branch?: string;
}

interface TeacherDetails {
  id: string;
  faculty_id: string;
  name: string;
  subjects: string[];
  sections: ('A' | 'B')[];
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
}

// Use shared bundled feedback type from types/feedback

interface LegacyFeedbackData {
  id: number;
  teacherId: string;
  teacherName: string;
  subject: string;
  section: string;
  rating: number;
  feedbackCount: number;
}

export default function HODDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [feedbackData, setFeedbackData] = useState<SubmissionBundle[]>([]);
  const [legacyData, setLegacyData] = useState<LegacyFeedbackData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Student management state
  const [students, setStudents] = useState<StudentDetails[]>([]);
  const [newStudent, setNewStudent] = useState<Partial<StudentDetails>>({
    reg_number: '',
    name: '',
    section: 'A',
    dob: '',
    email: '',
    phone: ''
  });
  const [studentFilter, setStudentFilter] = useState('all');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [showImportErrors, setShowImportErrors] = useState(false);
  const [importSuccess, setImportSuccess] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Teacher management state
  const [teachers, setTeachers] = useState<TeacherDetails[]>([]);
  const [newTeacher, setNewTeacher] = useState<Partial<TeacherDetails>>({
    faculty_id: '',
    name: '',
    subjects: [],
    sections: [],
    email: '',
    phone: ''
  });
  const [newSubject, setNewSubject] = useState('');

  useEffect(() => {
    // Check if user is logged in and is HOD
    if (!user || user.role !== 'hod') {
      navigate('/admin-login');
      return;
    }

    // Load data from backend
    loadDashboardData();
  }, [user, navigate]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      // Load students
      const studentsResponse = await apiService.getAllStudents();
      if (studentsResponse.success && studentsResponse.data?.students) {
        setStudents(studentsResponse.data.students);
      }

      // Load teachers
      const teachersResponse = await apiService.getAllFaculty();
      if (teachersResponse.success && teachersResponse.data?.faculty) {
        setTeachers(teachersResponse.data.faculty);
      }

      // Load feedback analytics
      const analyticsResponse = await apiService.getFeedbackAnalytics();
      if (analyticsResponse.success && analyticsResponse.data) {
        // Process analytics data for dashboard
        const analytics = analyticsResponse.data;
        
        // Convert analytics to legacy format for compatibility
        const legacyData: LegacyFeedbackData[] = [];
        if (analytics.top_faculty) {
          analytics.top_faculty.forEach((faculty: any, index: number) => {
            legacyData.push({
              id: index + 1,
              teacherId: faculty.faculty_id,
              teacherName: faculty.faculty_name,
              subject: faculty.subject,
              section: "A", // Default section, will be updated based on actual data
              rating: faculty.average_rating,
              feedbackCount: faculty.total_feedback
            });
          });
        }
        setLegacyData(legacyData);
      }

      // Load feedback bundles (student submissions)
      const bundlesResponse = await apiService.getFeedbackBundles();
      if (bundlesResponse.success && bundlesResponse.data?.bundles) {
        setFeedbackData(bundlesResponse.data.bundles);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success("Logged out successfully");
  };

  const handleExportData = () => {
    toast.success("Data exported successfully");
  };
  
  // Student management handlers
  const handleAddStudent = async () => {
    // Validate required fields
    if (!newStudent.reg_number || !newStudent.name || !newStudent.section || !newStudent.dob) {
      toast.error("Please fill all required fields");
      return;
    }
    
    try {
      const studentData = {
        reg_number: newStudent.reg_number,
        name: newStudent.name,
        section: newStudent.section,
        dob: newStudent.dob,
        email: newStudent.email || undefined,
        phone: newStudent.phone || undefined,
        year: newStudent.year || undefined,
        branch: newStudent.branch || undefined
      };

      const response = await apiService.createStudent(studentData);
      
      if (response.success) {
        // Reload students list
        await loadDashboardData();
        
        // Reset form
        setNewStudent({
          reg_number: '',
          name: '',
          section: 'A',
          dob: '',
          email: '',
          phone: ''
        });
        
        toast.success("Student registered successfully");
      } else {
        toast.error(response.message || "Failed to create student");
      }
    } catch (error) {
      console.error('Error creating student:', error);
      toast.error("Failed to create student");
    }
  };
  
  const handleStudentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewStudent(prev => ({ ...prev, [name]: value }));
  };
  
  const handleStudentSectionChange = (value: string) => {
    setNewStudent(prev => ({ ...prev, section: value as 'A' | 'B' }));
  };
  
  // Bulk import functionality
  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportErrors([]);
    setShowImportErrors(false);
    setImportSuccess(0);
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: string[] = [];
        const validStudents: StudentDetails[] = [];
        
        results.data.forEach((row: any, index: number) => {
          // Validate required fields
          if (!row.reg_number || !row.name || !row.section || !row.dob) {
            errors.push(`Row ${index + 1}: Missing required fields`);
            return;
          }
          
          // Check for duplicate registration numbers
          if (students.some(s => s.reg_number === row.reg_number) || 
              validStudents.some(s => s.reg_number === row.reg_number)) {
            errors.push(`Row ${index + 1}: Registration number ${row.reg_number} already exists`);
            return;
          }
          
          // Add valid student
          validStudents.push({
            id: `temp_${Date.now()}_${index}`, // Temporary ID for local state
            reg_number: row.reg_number,
            name: row.name,
            section: row.section as 'A' | 'B',
            dob: row.dob,
            email: row.email || '',
            phone: row.phone || ''
          });
        });
        
        if (validStudents.length > 0) {
          // Send to backend for actual import
          const importToBackend = async () => {
            try {
              // Create a temporary CSV file for backend import
              const csvContent = validStudents.map(student => 
                `${student.reg_number},${student.name},${student.section},${student.dob},${student.email || ''},${student.phone || ''}`
              ).join('\n');
              const csvHeader = 'reg_number,name,section,dob,email,phone\n';
              const fullCsv = csvHeader + csvContent;
              
              const blob = new Blob([fullCsv], { type: 'text/csv' });
              const file = new File([blob], 'students.csv', { type: 'text/csv' });
              
              const response = await apiService.importStudentsCSV(file);
              
              if (response.success) {
                // Reload students from backend
                await loadDashboardData();
                setImportSuccess(validStudents.length);
                toast.success(`Successfully imported ${validStudents.length} students`);
              } else {
                toast.error(response.message || 'Failed to import students');
              }
            } catch (error) {
              console.error('Error importing students:', error);
              toast.error('Failed to import students');
            }
          };
          
          importToBackend();
        }
        
        if (errors.length > 0) {
          setImportErrors(errors);
          setShowImportErrors(true);
          toast.error(`${errors.length} errors found during import`);
        }
      },
      error: (error) => {
        toast.error(`Error parsing file: ${error.message}`);
      }
    });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleDownloadTemplate = () => {
    const headers = "reg_number,name,section,dob,email,phone\n";
    const sampleData = "24G31A0599,John Doe,A,2000-01-01,john@example.com,9876543210\n";
    
    const blob = new Blob([headers + sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Template downloaded successfully");
  };
  
  // Filter students based on selected section
  const filteredStudents = studentFilter === 'all' 
    ? students 
    : students.filter(student => student.section === studentFilter);
  
  // Teacher management handlers
  const handleAddTeacher = async () => {
    // Validate required fields
    if (!newTeacher.faculty_id || !newTeacher.name || !newTeacher.subjects?.length || !newTeacher.sections?.length) {
      toast.error("Please fill all required fields");
      return;
    }
    
    try {
      const teacherData = {
        faculty_id: newTeacher.faculty_id,
        name: newTeacher.name,
        subjects: newTeacher.subjects,
        sections: newTeacher.sections,
        email: newTeacher.email || undefined,
        phone: newTeacher.phone || undefined,
        department: newTeacher.department || undefined,
        designation: newTeacher.designation || undefined
      };

      const response = await apiService.createFaculty(teacherData);
      
      if (response.success) {
        // Reload teachers list
        await loadDashboardData();
        
        // Reset form
        setNewTeacher({
          faculty_id: '',
          name: '',
          subjects: [],
          sections: [],
          email: '',
          phone: ''
        });
        setNewSubject('');
        
        toast.success("Teacher registered successfully");
      } else {
        toast.error(response.message || "Failed to create teacher");
      }
    } catch (error) {
      console.error('Error creating teacher:', error);
      toast.error("Failed to create teacher");
    }
  };
  
  const handleTeacherInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTeacher(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAddSubject = () => {
    if (!newSubject.trim()) return;
    
    if (newTeacher.subjects?.includes(newSubject.trim())) {
      toast.error("Subject already added");
      return;
    }
    
    setNewTeacher(prev => ({
      ...prev,
      subjects: [...(prev.subjects || []), newSubject.trim()]
    }));
    setNewSubject('');
  };
  
  const handleRemoveSubject = (index: number) => {
    setNewTeacher(prev => ({
      ...prev,
      subjects: prev.subjects?.filter((_, i) => i !== index) || []
    }));
  };
  
  const handleSectionToggle = (section: 'A' | 'B') => {
    setNewTeacher(prev => {
      const sections = (prev.sections || []) as ('A' | 'B')[];
      if (sections.includes(section)) {
        return { ...prev, sections: sections.filter(s => s !== section) };
      } else {
        return { ...prev, sections: [...sections, section] };
      }
    });
  };

  // Calculate statistics
  const totalResponses = feedbackData.length; // number of student submissions
  const totalTeacherRatings = feedbackData.flatMap(b => b.teacherFeedbacks).length;
  const averageRating = totalTeacherRatings > 0
    ? (
        feedbackData
          .flatMap(b => b.teacherFeedbacks)
          .reduce((sum, tf) => sum + (typeof tf.overallRating === 'number' ? tf.overallRating : 0), 0) / totalTeacherRatings
      ).toFixed(1)
    : "0";

  // Students per section
  const sectionAStudents = students.filter(s => s.section === 'A').length;
  const sectionBStudents = students.filter(s => s.section === 'B').length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">HOD Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, Dr. Cid, HOD</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportData}>
            Export Data
          </Button>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Responses</p>
                <h2 className="text-3xl font-bold">{totalResponses}</h2>
              </div>
              <div className="p-2 bg-primary/10 rounded-full text-primary">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Collected feedback entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Student Bundles</p>
                <h2 className="text-3xl font-bold">{totalResponses}</h2>
              </div>
              <div className="p-2 bg-primary/10 rounded-full text-primary">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Consolidated submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                <h2 className="text-3xl font-bold">{averageRating}/5</h2>
              </div>
              <div className="p-2 bg-primary/10 rounded-full text-primary">
                <Star className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Overall teacher performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Section A</p>
                <h2 className="text-3xl font-bold">{sectionAStudents}</h2>
              </div>
              <div className="p-2 bg-primary/10 rounded-full text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Section A students</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Section B</p>
                <h2 className="text-3xl font-bold">{sectionBStudents}</h2>
              </div>
              <div className="p-2 bg-primary/10 rounded-full text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Section B students</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-7 mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="student-bundles">Student Bundles</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="faculty">Faculty</TabsTrigger>
          <TabsTrigger value="all-feedback">All Feedback</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Feedback Distribution</CardTitle>
                <CardDescription>Students by section</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Section A</span>
                    <span>{sectionAStudents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Section B</span>
                    <span>{sectionBStudents}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage feedback data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={handleExportData}>
                  <Eye className="mr-2 h-4 w-4" /> Export All Data as CSV
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" /> Generate Analytics Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Register New Student</CardTitle>
                <CardDescription>Add a new student to the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg_number">Registration Number*</Label>
                      <Input 
                        id="reg_number" 
                        name="reg_number" 
                        placeholder="e.g., 24G31A0501" 
                        value={newStudent.reg_number || ''} 
                        onChange={handleStudentInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name*</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        placeholder="Student Name" 
                        value={newStudent.name || ''} 
                        onChange={handleStudentInputChange}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="section">Section*</Label>
                      <Select 
                        value={newStudent.section || 'A'} 
                        onValueChange={handleStudentSectionChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">Section A</SelectItem>
                          <SelectItem value="B">Section B</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth*</Label>
                      <Input 
                        id="dob" 
                        name="dob" 
                        type="date" 
                        value={newStudent.dob || ''} 
                        onChange={handleStudentInputChange}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        placeholder="student@example.com" 
                        value={newStudent.email || ''} 
                        onChange={handleStudentInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input 
                        id="phone" 
                        name="phone" 
                        placeholder="Phone number" 
                        value={newStudent.phone || ''} 
                        onChange={handleStudentInputChange}
                      />
                    </div>
                  </div>
                  
                  <Button className="w-full" onClick={handleAddStudent}>
                    <FiUserPlus className="mr-2" /> Register Student
                  </Button>
                  
                  <div className="flex flex-col md:flex-row gap-4 mt-4 border-t pt-4">
                    <div className="flex flex-col md:flex-row items-center gap-2 border rounded-md p-3 w-full">
                      <h4 className="text-sm font-medium mb-2 md:mb-0 md:mr-2">Bulk Import Students:</h4>
                      <div className="flex flex-wrap gap-2">
                        <Label htmlFor="csvImport" className="cursor-pointer">
                          <div className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md">
                            <Upload className="h-4 w-4" />
                            <span>Import CSV</span>
                          </div>
                          <Input 
                            id="csvImport" 
                            type="file" 
                            accept=".csv" 
                            className="hidden" 
                            onChange={handleBulkImport}
                            ref={fileInputRef}
                          />
                        </Label>
                        <Button variant="outline" onClick={handleDownloadTemplate}>
                          <Download className="mr-2 h-4 w-4" />
                          Download Template
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Import Results */}
                  {importSuccess > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3 mt-2">
                      <p className="text-green-800 text-sm">Successfully imported {importSuccess} students</p>
                    </div>
                  )}
                  
                  {/* Import Errors */}
                  {showImportErrors && importErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-red-800 font-medium flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Import Errors ({importErrors.length})
                        </h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setShowImportErrors(false)}
                        >
                          Hide
                        </Button>
                      </div>
                      <ul className="text-red-700 text-sm mt-2 max-h-40 overflow-y-auto">
                        {importErrors.map((error, index) => (
                          <li key={index} className="py-1 border-b border-red-100 last:border-0">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Student Management</CardTitle>
                <CardDescription>View and filter registered students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Label>Filter by Section</Label>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      variant={studentFilter === 'all' ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => setStudentFilter('all')}
                    >
                      All
                    </Button>
                    <Button 
                      variant={studentFilter === 'A' ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => setStudentFilter('A')}
                    >
                      Section A
                    </Button>
                    <Button 
                      variant={studentFilter === 'B' ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => setStudentFilter('B')}
                    >
                      Section B
                    </Button>
                  </div>
                </div>
                
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reg. Number</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>DOB</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                          <TableRow key={student.reg_number}>
                            <TableCell>{student.reg_number}</TableCell>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>Section {student.section}</TableCell>
                            <TableCell>{student.dob}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            No students found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="teachers">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Register New Teacher</CardTitle>
                <CardDescription>Add a new teacher to the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="faculty_id">Teacher ID*</Label>
                      <Input 
                        id="faculty_id" 
                        name="faculty_id" 
                        placeholder="e.g., T001" 
                        value={newTeacher.faculty_id || ''} 
                        onChange={handleTeacherInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name*</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        placeholder="Teacher Name" 
                        value={newTeacher.name || ''} 
                        onChange={handleTeacherInputChange}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Subjects*</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {newTeacher.subjects?.map((subject, index) => (
                        <Badge key={index} variant="secondary" className="px-2 py-1">
                          {subject}
                          <button 
                            type="button" 
                            className="ml-2 text-muted-foreground hover:text-foreground"
                            onClick={() => handleRemoveSubject(index)}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Add subject" 
                        value={newSubject} 
                        onChange={(e) => setNewSubject(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddSubject()}
                      />
                      <Button type="button" onClick={handleAddSubject} size="sm">
                        Add
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Assigned Sections*</Label>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        size="sm"
                        variant={newTeacher.sections?.includes('A') ? 'default' : 'outline'}
                        onClick={() => handleSectionToggle('A')}
                      >
                        Section A
                      </Button>
                      <Button 
                        type="button" 
                        size="sm"
                        variant={newTeacher.sections?.includes('B') ? 'default' : 'outline'}
                        onClick={() => handleSectionToggle('B')}
                      >
                        Section B
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        placeholder="teacher@example.com" 
                        value={newTeacher.email || ''} 
                        onChange={handleTeacherInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input 
                        id="phone" 
                        name="phone" 
                        placeholder="Phone number" 
                        value={newTeacher.phone || ''} 
                        onChange={handleTeacherInputChange}
                      />
                    </div>
                  </div>
                  
                  <Button className="w-full" onClick={handleAddTeacher}>
                    <FiUserPlus className="mr-2" /> Register Teacher
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Teacher Management</CardTitle>
                <CardDescription>View registered teachers and their assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Subjects</TableHead>
                        <TableHead>Sections</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teachers.length > 0 ? (
                        teachers.map((teacher) => (
                          <TableRow key={teacher.faculty_id}>
                            <TableCell>{teacher.faculty_id}</TableCell>
                            <TableCell>{teacher.name}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {teacher.subjects.map((subject, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {subject}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {teacher.sections.map((section) => (
                                  <Badge key={section} variant="secondary" className="text-xs">
                                    {section}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4">
                            No teachers found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}