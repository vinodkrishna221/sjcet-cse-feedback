import { z } from 'zod';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || 'http://localhost:8001/api/v1';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Auth schemas
const LoginSchema = z.object({
  reg_number: z.string(),
  dob: z.string()
});

const AdminLoginSchema = z.object({
  username: z.string(),
  password: z.string()
});

// API Service class
class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();
    
    if (!response.ok) {
      // Better error message handling
      let errorMessage = 'API request failed';
      if (data.message) {
        errorMessage = data.message;
      } else if (data.detail) {
        errorMessage = data.detail;
      } else if (data.errors) {
        // Handle validation errors
        if (Array.isArray(data.errors)) {
          errorMessage = data.errors.join(', ');
        } else if (typeof data.errors === 'object') {
          errorMessage = Object.values(data.errors).flat().join(', ');
        }
      }
      throw new Error(errorMessage);
    }
    
    return data;
  }

  // Student authentication
  async loginStudent(regNumber: string, dob: string) {
    const validatedData = LoginSchema.parse({ reg_number: regNumber, dob });
    
    const response = await fetch(`${API_BASE_URL}/auth/student/login`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(validatedData)
    });

    const result = await this.handleResponse<ApiResponse>(response);
    
    // Store auth token if provided
    if (result.data?.access_token) {
      localStorage.setItem('authToken', result.data.access_token);
    }
    
    return result;
  }

  // Admin authentication
  async loginAdmin(username: string, password: string) {
    const validatedData = AdminLoginSchema.parse({ username, password });
    
    const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(validatedData)
    });

    const result = await this.handleResponse<ApiResponse>(response);
    
    // Store auth token if provided
    if (result.data?.access_token) {
      localStorage.setItem('authToken', result.data.access_token);
    }
    
    return result;
  }

  // Get student details
  async getStudentByRegNumber(regNumber: string) {
    const response = await fetch(`${API_BASE_URL}/students/${regNumber}`, {
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Get teachers by section
  async getTeachersBySection(section: string) {
    const response = await fetch(`${API_BASE_URL}/faculty/by-section/${section}`, {
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Submit feedback
  async submitFeedback(feedbackData: any) {
    const response = await fetch(`${API_BASE_URL}/feedback/submit`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(feedbackData)
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Get all feedback bundles (for admin)
  async getFeedbackBundles(department?: string) {
    const params = new URLSearchParams();
    if (department) params.append('department', department);
    
    const url = `${API_BASE_URL}/feedback/bundles${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await fetch(url, {
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Get feedback analytics (for admin)
  async getFeedbackAnalytics(department?: string) {
    const params = new URLSearchParams();
    if (department) params.append('department', department);
    
    const url = `${API_BASE_URL}/feedback/analytics/dashboard${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await fetch(url, {
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Verify token
  async verifyToken() {
    const response = await fetch(`${API_BASE_URL}/auth/verify-token`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Get all students (for admin)
  async getAllStudents(section?: string, department?: string, batch_year?: string) {
    const params = new URLSearchParams();
    if (section) params.append('section', section);
    if (department) params.append('department', department);
    if (batch_year) params.append('batch_year', batch_year);
    
    const url = `${API_BASE_URL}/students${params.toString() ? `?${params.toString()}` : ''}`;
      
    const response = await fetch(url, {
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Get all faculty (for admin)
  async getAllFaculty(section?: string, subject?: string, department?: string) {
    const params = new URLSearchParams();
    if (section) params.append('section', section);
    if (subject) params.append('subject', subject);
    if (department) params.append('department', department);
    
    const url = `${API_BASE_URL}/faculty${params.toString() ? `?${params.toString()}` : ''}`;
      
    const response = await fetch(url, {
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Get section analytics
  async getSectionAnalytics(section: string) {
    const response = await fetch(`${API_BASE_URL}/feedback/analytics/section/${section}`, {
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Get faculty analytics
  async getFacultyAnalytics(facultyId: string, section?: string) {
    const url = section 
      ? `${API_BASE_URL}/feedback/analytics/faculty/${facultyId}?section=${section}`
      : `${API_BASE_URL}/feedback/analytics/faculty/${facultyId}`;
      
    const response = await fetch(url, {
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Get feedback questions
  async getFeedbackQuestions() {
    const response = await fetch(`${API_BASE_URL}/feedback/questions`, {
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Create student (for admin)
  async createStudent(studentData: any) {
    const response = await fetch(`${API_BASE_URL}/students/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(studentData)
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Update student (for admin)
  async updateStudent(studentId: string, studentData: any) {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(studentData)
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Delete student (for admin)
  async deleteStudent(studentId: string) {
    const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Create faculty (for admin)
  async createFaculty(facultyData: any) {
    const response = await fetch(`${API_BASE_URL}/faculty/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(facultyData)
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Update faculty (for admin)
  async updateFaculty(facultyId: string, facultyData: any) {
    const response = await fetch(`${API_BASE_URL}/faculty/${facultyId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(facultyData)
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Delete faculty (for admin)
  async deleteFaculty(facultyId: string) {
    const response = await fetch(`${API_BASE_URL}/faculty/${facultyId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Import students from CSV (for admin)
  async importStudentsCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/students/import/csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: formData
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Import faculty from CSV (for admin)
  async importFacultyCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE_URL}/faculty/import/csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: formData
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Get section summary (for admin)
  async getSectionSummary() {
    const response = await fetch(`${API_BASE_URL}/students/sections/summary`, {
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Get all subjects (for admin)
  async getAllSubjects() {
    const response = await fetch(`${API_BASE_URL}/faculty/subjects/list`, {
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Principal HOD Management
  async createHOD(hodData: {
    username: string;
    password: string;
    name: string;
    email?: string;
    phone?: string;
    department: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/admin/hods`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        ...hodData,
        role: 'hod'
      })
    });

    return this.handleResponse<ApiResponse>(response);
  }

  async getHODs(department?: string) {
    const url = department 
      ? `${API_BASE_URL}/admin/hods?department=${encodeURIComponent(department)}`
      : `${API_BASE_URL}/admin/hods`;
    
    const response = await fetch(url, {
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  async updateHOD(hodId: string, hodData: {
    username: string;
    password?: string;
    name: string;
    email?: string;
    phone?: string;
    department: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/admin/hods/${hodId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(hodData)
    });

    return this.handleResponse<ApiResponse>(response);
  }

  async deleteHOD(hodId: string) {
    const response = await fetch(`${API_BASE_URL}/admin/hods/${hodId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Principal Department Management
  async createDepartment(departmentData: {
    name: string;
    code: string;
    description?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/admin/departments`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(departmentData)
    });

    return this.handleResponse<ApiResponse>(response);
  }

  async getDepartments() {
    const response = await fetch(`${API_BASE_URL}/admin/departments`, {
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  async updateDepartment(deptId: string, departmentData: {
    name: string;
    code: string;
    description?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/admin/departments/${deptId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(departmentData)
    });

    return this.handleResponse<ApiResponse>(response);
  }

  async deleteDepartment(deptId: string) {
    const response = await fetch(`${API_BASE_URL}/admin/departments/${deptId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Principal Batch Year Management
  async createBatchYear(batchData: {
    year_range: string;
    department: string;
    sections: ('A' | 'B' | 'C' | 'D')[];
  }) {
    const response = await fetch(`${API_BASE_URL}/admin/batch-years`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(batchData)
    });

    return this.handleResponse<ApiResponse>(response);
  }

  async getBatchYears(department?: string) {
    const url = department 
      ? `${API_BASE_URL}/admin/batch-years?department=${encodeURIComponent(department)}`
      : `${API_BASE_URL}/admin/batch-years`;
    
    const response = await fetch(url, {
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  async addSectionsToBatchYear(batchId: string, sections: ('A' | 'B' | 'C' | 'D')[]) {
    const response = await fetch(`${API_BASE_URL}/admin/batch-years/${batchId}/sections`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ sections })
    });

    return this.handleResponse<ApiResponse>(response);
  }

  async updateBatchYear(batchId: string, batchData: {
    year_range?: string;
    department?: string;
    sections?: ('A' | 'B' | 'C' | 'D')[];
  }) {
    const response = await fetch(`${API_BASE_URL}/admin/batch-years/${batchId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(batchData)
    });

    return this.handleResponse<ApiResponse>(response);
  }

  async deleteBatchYear(batchId: string) {
    const response = await fetch(`${API_BASE_URL}/admin/batch-years/${batchId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  async getDepartmentSections(deptId: string) {
    const response = await fetch(`${API_BASE_URL}/admin/departments/${deptId}/sections`, {
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Report Generation
  async generateReport(filters: {
    department: string;
    batch_year: string;
    section: 'A' | 'B' | 'C' | 'D';
    format: 'csv' | 'pdf' | 'excel';
  }) {
    const response = await fetch(`${API_BASE_URL}/feedback/reports/generate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(filters)
    });

    return this.handleResponse<ApiResponse>(response);
  }

  async getReportHistory(department?: string) {
    const url = department 
      ? `${API_BASE_URL}/feedback/reports/history?department=${encodeURIComponent(department)}`
      : `${API_BASE_URL}/feedback/reports/history`;
    
    const response = await fetch(url, {
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  async downloadReport(reportId: string) {
    const response = await fetch(`${API_BASE_URL}/feedback/reports/download/${reportId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.detail || 'Download failed');
    }

    // Return blob for file download
    return response.blob();
  }

  // Helper method to download file from blob
  downloadFileFromBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Logout
  logout() {
    localStorage.removeItem('authToken');
  }
}

export const apiService = new ApiService();