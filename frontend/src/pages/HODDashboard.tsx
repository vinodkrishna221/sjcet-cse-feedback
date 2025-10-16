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
import { LogOut, Eye, TrendingUp, Users, Star, BookOpen, Package, Upload, Download, CircleAlert as AlertCircle, ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { FiUserPlus } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { apiService } from "@/services/api";
import { toast } from "sonner";
import Papa from 'papaparse';
import { BundledFeedback as SubmissionBundle, BatchYear, Department } from "@/types/feedback";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReportGenerator from "@/components/ReportGenerator";

// Backend-compatible interfaces based on models.py
interface StudentDetails {
  id: string;
  reg_number: string;
  name: string;
  section: 'A' | 'B' | 'C' | 'D';
  dob: string;
  email?: string;
  phone?: string;
  year?: string;
  branch?: string;
  department?: string;
  batch_year?: string;
}

interface TeacherDetails {
  id: string;
  faculty_id: string;
  name: string;
  subjects: string[];
  sections: ('A' | 'B' | 'C' | 'D')[];
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
}

// Use shared bundled feedback type from types/feedback

export default function HODDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [feedbackData, setFeedbackData] = useState<SubmissionBundle[]>([]);
  const [expandedBundles, setExpandedBundles] = useState<Record<string, boolean>>({});
  const [expandedTeachersByBundle, setExpandedTeachersByBundle] = useState<Record<string, Record<string, boolean>>>({});
  
  // Student management state
  const [students, setStudents] = useState<StudentDetails[]>([]);
  const [newStudent, setNewStudent] = useState<Partial<StudentDetails>>({
    reg_number: '',
    name: '',
    section: 'A',
    dob: '',
    email: '',
    phone: '',
    year: '',
    department: user?.department || 'CSE',
    batch_year: '2024-2028'
  });
  const [studentFilter, setStudentFilter] = useState('all');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [showImportErrors, setShowImportErrors] = useState(false);
  const [importSuccess, setImportSuccess] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Student edit/delete state
  const [editingStudent, setEditingStudent] = useState<StudentDetails | null>(null);
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [studentEditForm, setStudentEditForm] = useState<Partial<StudentDetails>>({});
  
  // Teacher management state
  const [teachers, setTeachers] = useState<TeacherDetails[]>([]);
  const [newTeacher, setNewTeacher] = useState<Partial<TeacherDetails>>({
    faculty_id: '',
    name: '',
    subjects: [],
    sections: [],
    email: '',
    phone: '',
    department: user?.department || 'CSE'
  });
  const [newSubject, setNewSubject] = useState('');

  // Teacher edit/delete state
  const [editingTeacher, setEditingTeacher] = useState<TeacherDetails | null>(null);
  const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false);
  const [teacherEditForm, setTeacherEditForm] = useState<Partial<TeacherDetails>>({});
  
  // Batch year and department filtering state
  const [selectedBatchYear, setSelectedBatchYear] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [batchYears, setBatchYears] = useState<BatchYear[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);

  useEffect(() => {
    // Check if user is logged in and is HOD
    if (!user || user.role !== 'hod') {
      navigate('/admin-login');
      return;
    }

    // Load data from backend
    loadDashboardData();
  }, [user, navigate]);

  // Reload data when filters change
  useEffect(() => {
    if (user?.role === 'hod') {
      loadDashboardData();
    }
  }, [selectedBatchYear, selectedSection]);

  const loadDashboardData = async () => {
    try {
      // Load batch years and departments
      const batchYearsResponse = await apiService.getBatchYears(user?.department);
      if (batchYearsResponse.success && batchYearsResponse.data?.batch_years) {
        setBatchYears(batchYearsResponse.data.batch_years);
        
        // Extract unique sections from batch years
        const uniqueSections = new Set<string>();
        batchYearsResponse.data.batch_years.forEach((batch: BatchYear) => {
          batch.sections.forEach(section => uniqueSections.add(section));
        });
        setAvailableSections(Array.from(uniqueSections).sort());
      }
      
      const departmentsResponse = await apiService.getDepartments();
      if (departmentsResponse.success && departmentsResponse.data?.departments) {
        setDepartments(departmentsResponse.data.departments);
      }
      
      // Load students with department filter
      const studentsResponse = await apiService.getAllStudents(
        undefined, // section
        user?.department, // department
        selectedBatchYear !== 'all' ? selectedBatchYear : undefined // batch_year
      );
      if (studentsResponse.success && studentsResponse.data?.students) {
        setStudents(studentsResponse.data.students);
      }

      // Load teachers with department filter
      const teachersResponse = await apiService.getAllFaculty(
        undefined, // section
        undefined, // subject
        user?.department // department
      );
      if (teachersResponse.success && teachersResponse.data?.faculty) {
        setTeachers(teachersResponse.data.faculty);
      }

      // Load feedback bundles (student submissions) with department filter
      const bundlesResponse = await apiService.getFeedbackBundles(user?.department);
      if (bundlesResponse.success && bundlesResponse.data?.bundles) {
        setFeedbackData(bundlesResponse.data.bundles);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success("Logged out successfully");
  };

  // Expand/collapse handlers for bundles/teachers
  const toggleBundle = (bundleId: string) => {
    setExpandedBundles(prev => ({ ...prev, [bundleId]: !prev[bundleId] }));
  };

  const toggleTeacher = (bundleId: string, teacherKey: string) => {
    setExpandedTeachersByBundle(prev => ({
      ...prev,
      [bundleId]: {
        ...(prev[bundleId] || {}),
        [teacherKey]: !(prev[bundleId]?.[teacherKey])
      }
    }));
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
        branch: newStudent.branch || undefined,
        department: newStudent.department,
        batch_year: newStudent.batch_year
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
          phone: '',
          year: '',
          department: user?.department || 'CSE',
          batch_year: '2024-2028'
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

  // Student edit/delete handlers
  const openStudentEdit = (student: StudentDetails) => {
    setEditingStudent(student);
    setStudentEditForm({ ...student });
    setIsStudentDialogOpen(true);
  };

  const handleStudentEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStudentEditForm(prev => ({ ...prev, [name]: value }));
  };

  const saveStudentEdit = async () => {
    if (!editingStudent) return;
    try {
      const payload = {
        reg_number: studentEditForm.reg_number,
        name: studentEditForm.name,
        section: studentEditForm.section,
        dob: studentEditForm.dob,
        email: studentEditForm.email || undefined,
        phone: studentEditForm.phone || undefined,
        year: studentEditForm.year || undefined,
        branch: studentEditForm.branch || undefined
      } as any;
      const resp = await apiService.updateStudent(editingStudent.id, payload);
      if (resp.success) {
        toast.success("Student updated successfully");
        setIsStudentDialogOpen(false);
        setEditingStudent(null);
        await loadDashboardData();
      } else {
        toast.error(resp.message || "Failed to update student");
      }
    } catch (e) {
      toast.error("Failed to update student");
    }
  };

  const deleteStudent = async (student: StudentDetails) => {
    try {
      const resp = await apiService.deleteStudent(student.id);
      if (resp.success) {
        toast.success("Student deleted");
        await loadDashboardData();
      } else {
        toast.error(resp.message || "Failed to delete student");
      }
    } catch (e) {
      toast.error("Failed to delete student");
    }
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

  // Teacher edit/delete handlers
  const openTeacherEdit = (teacher: TeacherDetails) => {
    setEditingTeacher(teacher);
    setTeacherEditForm({ ...teacher });
    setIsTeacherDialogOpen(true);
  };

  const handleTeacherEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTeacherEditForm(prev => ({ ...prev, [name]: value }));
  };

  const saveTeacherEdit = async () => {
    if (!editingTeacher) return;
    try {
      const payload = {
        faculty_id: teacherEditForm.faculty_id,
        name: teacherEditForm.name,
        subjects: teacherEditForm.subjects || [],
        sections: teacherEditForm.sections || [],
        email: teacherEditForm.email || undefined,
        phone: teacherEditForm.phone || undefined,
        department: teacherEditForm.department || undefined,
        designation: teacherEditForm.designation || undefined
      } as any;
      const resp = await apiService.updateFaculty(editingTeacher.id, payload);
      if (resp.success) {
        toast.success("Teacher updated successfully");
        setIsTeacherDialogOpen(false);
        setEditingTeacher(null);
        await loadDashboardData();
      } else {
        toast.error(resp.message || "Failed to update teacher");
      }
    } catch (e) {
      toast.error("Failed to update teacher");
    }
  };

  const deleteTeacher = async (teacher: TeacherDetails) => {
    try {
      const resp = await apiService.deleteFaculty(teacher.id);
      if (resp.success) {
        toast.success("Teacher deleted");
        await loadDashboardData();
      } else {
        toast.error(resp.message || "Failed to delete teacher");
      }
    } catch (e) {
      toast.error("Failed to delete teacher");
    }
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
          <p className="text-muted-foreground">Welcome back, {user?.name || 'HOD'}, HOD</p>
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
                <h2 className="text-3xl font-bold">{averageRating}/10</h2>
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
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Filter Controls */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter data by batch year and section</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="batch-year-filter">Batch Year</Label>
                  <Select value={selectedBatchYear} onValueChange={setSelectedBatchYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select batch year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Batch Years</SelectItem>
                      {batchYears.map((batch) => (
                        <SelectItem key={batch.id} value={batch.year_range}>
                          {batch.year_range}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="section-filter">Section</Label>
                  <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {availableSections.map((section) => (
                        <SelectItem key={section} value={section}>Section {section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedBatchYear('all');
                      setSelectedSection('all');
                    }}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

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

        {/* Student Bundles Tab */}
        <TabsContent value="student-bundles">
          <Card>
            <CardHeader>
              <CardTitle>Student Bundles</CardTitle>
              <CardDescription>Expand a student to view faculty and per-question details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {feedbackData.length === 0 && (
                  <div className="text-center text-muted-foreground py-6">No bundles found</div>
                )}
                {feedbackData.map((bundle) => {
                  const isOpen = !!expandedBundles[bundle.id];
                  return (
                    <div key={bundle.id} className="border rounded-lg">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button className="p-1" onClick={() => toggleBundle(bundle.id)} aria-label="Toggle bundle">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <div>
                            <div className="font-medium">{bundle.studentName}</div>
                            <div className="text-xs text-muted-foreground">Section {bundle.studentSection} • {bundle.teacherFeedbacks.length} teachers</div>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {bundle.submittedAt ? new Date(bundle.submittedAt).toLocaleString() : '-'}
                        </div>
                      </div>
                      {isOpen && (
                        <div className="border-t">
                          {/* Faculty list */}
                          {bundle.teacherFeedbacks.map((tf, idx) => {
                            const teacherKey = `${tf.teacherId}-${idx}`;
                            const tOpen = !!(expandedTeachersByBundle[bundle.id]?.[teacherKey]);
                            return (
                              <div key={teacherKey} className="px-6 py-3 border-t">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    <button className="p-1" onClick={() => toggleTeacher(bundle.id, teacherKey)} aria-label="Toggle teacher">
                                      {tOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </button>
                                    <div>
                                      <div className="font-medium">{tf.teacherName}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {tf.subject} • Overall {tf.overallRating}/10
                                        {tf.weightedScore && (
                                          <span className="ml-2">
                                            • Weighted: {tf.weightedScore.toFixed(1)}% 
                                            <Badge 
                                              variant={tf.gradeInterpretation === 'Excellent' ? 'default' : 
                                                      tf.gradeInterpretation === 'Very Good' ? 'secondary' : 
                                                      tf.gradeInterpretation === 'Good' ? 'outline' : 'destructive'}
                                              className="ml-1 text-xs"
                                            >
                                              {tf.gradeInterpretation}
                                            </Badge>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {tOpen && (
                                  <div className="mt-3 ml-6">
                                    {/* Per-question ratings */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {tf.questionRatings.map((qr, qidx) => (
                                        <div key={`${qr.questionId}-${qidx}`} className="p-3 bg-muted/30 rounded border">
                                          <div className="text-xs text-muted-foreground">{qr.question}</div>
                                          <div className="flex justify-between items-center mt-1">
                                            <div className="text-sm font-medium">Rating: {qr.rating}/10</div>
                                            <Badge variant="outline" className="text-xs">
                                              Weight: {qr.weight}%
                                            </Badge>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    {/* Detailed feedback and suggestions */}
                                    {(tf.detailedFeedback || tf.suggestions) && (
                                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {tf.detailedFeedback && (
                                          <div className="p-3 bg-background border rounded">
                                            <div className="text-xs text-muted-foreground mb-1">Detailed Feedback</div>
                                            <div className="text-sm">{tf.detailedFeedback}</div>
                                          </div>
                                        )}
                                        {tf.suggestions && (
                                          <div className="p-3 bg-background border rounded">
                                            <div className="text-xs text-muted-foreground mb-1">Suggestions / Improvements</div>
                                            <div className="text-sm">{tf.suggestions}</div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Removed All Feedback Tab as requested */}

        {/* Faculty Tab - simple aggregation from bundles */}
        <TabsContent value="faculty">
          <Card>
            <CardHeader>
              <CardTitle>Faculty Performance</CardTitle>
              <CardDescription>Weighted scores and grade interpretation per teacher</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Ratings Count</TableHead>
                      <TableHead>Average Rating</TableHead>
                      <TableHead>Weighted Score</TableHead>
                      <TableHead>Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const rows: { key: string; teacherName: string; subject: string; count: number; avg: number; weightedScore: number; grade: string }[] = [];
                      const map = new Map<string, { sum: number; count: number; teacherName: string; subject: string; weightedSum: number; weightedCount: number }>();
                      feedbackData.forEach(b => {
                        b.teacherFeedbacks.forEach(tf => {
                          const key = `${tf.teacherId}|${tf.subject}`;
                          const entry = map.get(key) || { sum: 0, count: 0, teacherName: tf.teacherName, subject: tf.subject, weightedSum: 0, weightedCount: 0 };
                          entry.sum += typeof tf.overallRating === 'number' ? tf.overallRating : 0;
                          entry.count += 1;
                          if (tf.weightedScore) {
                            entry.weightedSum += tf.weightedScore;
                            entry.weightedCount += 1;
                          }
                          map.set(key, entry);
                        });
                      });
                      map.forEach((v, k) => {
                        const avgWeightedScore = v.weightedCount ? +(v.weightedSum / v.weightedCount).toFixed(1) : 0;
                        let grade = 'Needs Improvement';
                        if (avgWeightedScore >= 90) grade = 'Excellent';
                        else if (avgWeightedScore >= 80) grade = 'Very Good';
                        else if (avgWeightedScore >= 70) grade = 'Good';
                        else if (avgWeightedScore >= 60) grade = 'Average';
                        
                        rows.push({ 
                          key: k, 
                          teacherName: v.teacherName, 
                          subject: v.subject, 
                          count: v.count, 
                          avg: v.count ? +(v.sum / v.count).toFixed(2) : 0,
                          weightedScore: avgWeightedScore,
                          grade: grade
                        });
                      });
                      if (rows.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4">No faculty ratings yet</TableCell>
                          </TableRow>
                        );
                      }
                      return rows.map(r => (
                        <TableRow key={r.key}>
                          <TableCell>{r.teacherName}</TableCell>
                          <TableCell>{r.subject}</TableCell>
                          <TableCell>{r.count}</TableCell>
                          <TableCell>{r.avg}/10</TableCell>
                          <TableCell>
                            <span className="font-medium text-green-600">{r.weightedScore}%</span>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={r.grade === 'Excellent' ? 'default' : 
                                      r.grade === 'Very Good' ? 'secondary' : 
                                      r.grade === 'Good' ? 'outline' : 'destructive'}
                            >
                              {r.grade}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
                          {availableSections.map((section) => (
                            <SelectItem key={section} value={section}>Section {section}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department*</Label>
                      <Select 
                        value={newStudent.department || 'CSE'} 
                        onValueChange={(value) => setNewStudent(prev => ({ ...prev, department: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.code}>
                              {dept.name} ({dept.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="batch_year">Batch Year*</Label>
                      <Select 
                        value={newStudent.batch_year || '2024-2028'} 
                        onValueChange={(value) => setNewStudent(prev => ({ ...prev, batch_year: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select batch year" />
                        </SelectTrigger>
                        <SelectContent>
                          {batchYears.map((batch) => (
                            <SelectItem key={batch.id} value={batch.year_range}>
                              {batch.year_range}
                            </SelectItem>
                          ))}
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <Input 
                        id="year" 
                        name="year" 
                        placeholder="e.g., 1st Year, 2nd Year" 
                        value={newStudent.year || ''} 
                        onChange={handleStudentInputChange}
                      />
                    </div>
                    <div></div>
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
                    {availableSections.map((section) => (
                      <Button 
                        key={section}
                        variant={studentFilter === section ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setStudentFilter(section)}
                      >
                        Section {section}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reg. Number</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Batch Year</TableHead>
                        <TableHead>DOB</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                          <TableRow key={student.reg_number}>
                            <TableCell>{student.reg_number}</TableCell>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>Section {student.section}</TableCell>
                            <TableCell>{student.department || 'N/A'}</TableCell>
                            <TableCell>{student.batch_year || 'N/A'}</TableCell>
                            <TableCell>{student.dob}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => openStudentEdit(student)}>
                                  <Pencil className="h-4 w-4 mr-1" /> Edit
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => deleteStudent(student)}>
                                  <Trash2 className="h-4 w-4 mr-1" /> Remove
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4">
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
                      {availableSections.map((section) => (
                        <Button 
                          key={section}
                          type="button" 
                          size="sm"
                          variant={newTeacher.sections?.includes(section as any) ? 'default' : 'outline'}
                          onClick={() => handleSectionToggle(section as any)}
                        >
                          Section {section}
                        </Button>
                      ))}
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
                        <TableHead>Actions</TableHead>
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
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => openTeacherEdit(teacher)}>
                                  <Pencil className="h-4 w-4 mr-1" /> Edit
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => deleteTeacher(teacher)}>
                                  <Trash2 className="h-4 w-4 mr-1" /> Remove
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
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

        {/* Reports Tab */}
        <TabsContent value="reports">
          <ReportGenerator 
            userRole="hod" 
            userDepartment={user?.department || 'CSE'}
            onReportGenerated={loadDashboardData}
          />
        </TabsContent>
      </Tabs>

      {/* Student Edit Dialog */}
      <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="space-y-2">
              <Label htmlFor="edit_reg_number">Registration Number</Label>
              <Input id="edit_reg_number" name="reg_number" value={studentEditForm.reg_number || ''} onChange={handleStudentEditInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_name">Full Name</Label>
              <Input id="edit_name" name="name" value={studentEditForm.name || ''} onChange={handleStudentEditInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_section">Section</Label>
              <Input id="edit_section" name="section" value={(studentEditForm.section as any) || ''} onChange={handleStudentEditInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_dob">Date of Birth</Label>
              <Input id="edit_dob" name="dob" type="date" value={studentEditForm.dob || ''} onChange={handleStudentEditInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input id="edit_email" name="email" value={studentEditForm.email || ''} onChange={handleStudentEditInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_phone">Phone</Label>
              <Input id="edit_phone" name="phone" value={studentEditForm.phone || ''} onChange={handleStudentEditInputChange} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStudentDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveStudentEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teacher Edit Dialog */}
      <Dialog open={isTeacherDialogOpen} onOpenChange={setIsTeacherDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="space-y-2">
              <Label htmlFor="edit_faculty_id">Teacher ID</Label>
              <Input id="edit_faculty_id" name="faculty_id" value={teacherEditForm.faculty_id || ''} onChange={handleTeacherEditInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_t_name">Full Name</Label>
              <Input id="edit_t_name" name="name" value={teacherEditForm.name || ''} onChange={handleTeacherEditInputChange} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit_subjects">Subjects (comma separated)</Label>
              <Input id="edit_subjects" name="subjects" value={(teacherEditForm.subjects || []).join(', ')} onChange={(e) => setTeacherEditForm(prev => ({ ...prev, subjects: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_sections">Sections (comma separated A,B)</Label>
              <Input id="edit_sections" name="sections" value={(teacherEditForm.sections || []).join(', ')} onChange={(e) => setTeacherEditForm(prev => ({ ...prev, sections: e.target.value.split(',').map(s => s.trim().toUpperCase() as any).filter(Boolean) }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_t_email">Email</Label>
              <Input id="edit_t_email" name="email" value={teacherEditForm.email || ''} onChange={handleTeacherEditInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_t_phone">Phone</Label>
              <Input id="edit_t_phone" name="phone" value={teacherEditForm.phone || ''} onChange={handleTeacherEditInputChange} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTeacherDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveTeacherEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}