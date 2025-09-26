import { z } from 'zod';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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
      throw new Error(data.message || data.detail || 'API request failed');
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
  async getFeedbackBundles() {
    const response = await fetch(`${API_BASE_URL}/feedback/bundles`, {
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Get feedback analytics (for admin)
  async getFeedbackAnalytics() {
    const response = await fetch(`${API_BASE_URL}/feedback/analytics`, {
      headers: this.getAuthHeaders()
    });

    return this.handleResponse<ApiResponse>(response);
  }

  // Logout
  logout() {
    localStorage.removeItem('authToken');
  }
}

export const apiService = new ApiService();