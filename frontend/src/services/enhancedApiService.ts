/**
 * Enhanced API service with optimistic updates and error handling
 */
import { useAppStore } from '../stores/useAppStore';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error_code?: string;
  details?: any;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

class EnhancedApiService {
  private baseUrl: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
    this.loadTokens();
  }

  private loadTokens() {
    this.token = localStorage.getItem('authToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  private saveTokens(token: string, refreshToken: string) {
    this.token = token;
    this.refreshToken = refreshToken;
    localStorage.setItem('authToken', token);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearTokens() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data: ApiResponse<{ access_token: string }> = await response.json();
      
      if (data.success && data.data?.access_token) {
        this.token = data.data.access_token;
        localStorage.setItem('authToken', this.token);
        return this.token;
      } else {
        throw new Error('Invalid refresh response');
      }
    } catch (error) {
      this.clearTokens();
      useAppStore.getState().logout();
      throw error;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOnAuth = true
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle token refresh on 401
      if (response.status === 401 && retryOnAuth && this.refreshToken) {
        try {
          await this.refreshAccessToken();
          // Retry the request with new token
          return this.makeRequest(endpoint, options, false);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          useAppStore.getState().logout();
          throw new Error('Authentication failed');
        }
      }

      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        const error = new Error(data.message || 'Request failed') as ApiError;
        error.status = response.status;
        error.code = data.error_code;
        error.details = data.details;
        throw error;
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error');
    }
  }

  // Optimistic update helper
  private async withOptimisticUpdate<T>(
    optimisticUpdate: () => void,
    apiCall: () => Promise<T>,
    rollback: () => void
  ): Promise<T> {
    // Apply optimistic update
    optimisticUpdate();

    try {
      // Make API call
      const result = await apiCall();
      return result;
    } catch (error) {
      // Rollback on error
      rollback();
      throw error;
    }
  }

  // Authentication methods
  async login(credentials: { username?: string; reg_number?: string; password?: string; dob?: string }) {
    const endpoint = credentials.username ? '/auth/admin/login' : '/auth/student/login';
    const response = await this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data) {
      const { user, access_token, refresh_token } = response.data;
      this.saveTokens(access_token, refresh_token);
      useAppStore.getState().login(user, access_token, refresh_token);
    }

    return response;
  }

  async logout() {
    try {
      await this.makeRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      // Ignore logout errors
    } finally {
      this.clearTokens();
      useAppStore.getState().logout();
    }
  }

  async verifyToken() {
    const response = await this.makeRequest('/auth/verify-token');
    if (response.success && response.data?.user) {
      useAppStore.getState().updateUser(response.data.user);
    }
    return response;
  }

  // Student methods with optimistic updates
  async getStudents(params: {
    page?: number;
    limit?: number;
    section?: string;
    department?: string;
    batch_year?: string;
    fields?: string[];
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  } = {}) {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.section) searchParams.set('section', params.section);
    if (params.department) searchParams.set('department', params.department);
    if (params.batch_year) searchParams.set('batch_year', params.batch_year);
    if (params.fields) searchParams.set('fields', params.fields.join(','));
    if (params.sort_by) searchParams.set('sort_by', params.sort_by);
    if (params.sort_order) searchParams.set('sort_order', params.sort_order);

    const queryString = searchParams.toString();
    const endpoint = `/students${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<PaginatedResponse>(endpoint);
  }

  async createStudent(studentData: any) {
    return this.withOptimisticUpdate(
      () => {
        // Optimistic update: add to local state
        useAppStore.getState().addNotification({
          type: 'info',
          title: 'Creating Student',
          message: 'Student is being created...',
        });
      },
      () => this.makeRequest('/students', {
        method: 'POST',
        body: JSON.stringify(studentData),
      }),
      () => {
        // Rollback: remove from local state
        useAppStore.getState().addNotification({
          type: 'error',
          title: 'Student Creation Failed',
          message: 'Failed to create student. Please try again.',
        });
      }
    );
  }

  async updateStudent(id: string, studentData: any) {
    return this.withOptimisticUpdate(
      () => {
        // Optimistic update: update local state
        useAppStore.getState().addNotification({
          type: 'info',
          title: 'Updating Student',
          message: 'Student is being updated...',
        });
      },
      () => this.makeRequest(`/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(studentData),
      }),
      () => {
        // Rollback: revert local state
        useAppStore.getState().addNotification({
          type: 'error',
          title: 'Student Update Failed',
          message: 'Failed to update student. Please try again.',
        });
      }
    );
  }

  async deleteStudent(id: string) {
    return this.withOptimisticUpdate(
      () => {
        // Optimistic update: remove from local state
        useAppStore.getState().addNotification({
          type: 'info',
          title: 'Deleting Student',
          message: 'Student is being deleted...',
        });
      },
      () => this.makeRequest(`/students/${id}`, {
        method: 'DELETE',
      }),
      () => {
        // Rollback: restore to local state
        useAppStore.getState().addNotification({
          type: 'error',
          title: 'Student Deletion Failed',
          message: 'Failed to delete student. Please try again.',
        });
      }
    );
  }

  // Faculty methods
  async getFaculty(params: {
    page?: number;
    limit?: number;
    department?: string;
    fields?: string[];
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  } = {}) {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.department) searchParams.set('department', params.department);
    if (params.fields) searchParams.set('fields', params.fields.join(','));
    if (params.sort_by) searchParams.set('sort_by', params.sort_by);
    if (params.sort_order) searchParams.set('sort_order', params.sort_order);

    const queryString = searchParams.toString();
    const endpoint = `/faculty${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<PaginatedResponse>(endpoint);
  }

  async getFacultyBySection(section: string) {
    return this.makeRequest(`/faculty/by-section/${section}`);
  }

  // Feedback methods
  async submitFeedback(feedbackData: any) {
    return this.withOptimisticUpdate(
      () => {
        // Optimistic update: add to submitted feedback
        useAppStore.getState().addSubmittedFeedback(feedbackData);
        useAppStore.getState().addNotification({
          type: 'info',
          title: 'Submitting Feedback',
          message: 'Your feedback is being submitted...',
        });
      },
      () => this.makeRequest('/feedback/submit', {
        method: 'POST',
        body: JSON.stringify(feedbackData),
      }),
      () => {
        // Rollback: remove from submitted feedback
        useAppStore.getState().addNotification({
          type: 'error',
          title: 'Feedback Submission Failed',
          message: 'Failed to submit feedback. Please try again.',
        });
      }
    );
  }

  async getFeedbackAnalytics(params: {
    section?: string;
    semester?: string;
    academic_year?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    
    if (params.section) searchParams.set('section', params.section);
    if (params.semester) searchParams.set('semester', params.semester);
    if (params.academic_year) searchParams.set('academic_year', params.academic_year);

    const queryString = searchParams.toString();
    const endpoint = `/feedback/analytics${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest(endpoint);
  }

  // Bulk operations
  async bulkCreateStudents(students: any[]) {
    return this.makeRequest('/students/bulk-create', {
      method: 'POST',
      body: JSON.stringify({ items: students }),
    });
  }

  async bulkUpdateStudents(updates: any[]) {
    return this.makeRequest('/students/bulk-update', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
  }

  async bulkDeleteStudents(ids: string[]) {
    return this.makeRequest('/students/bulk-delete', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  }

  // File upload methods
  async uploadFile(file: File, endpoint: string) {
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error('File upload failed');
    }

    return response.json();
  }
}

// Create singleton instance
export const apiService = new EnhancedApiService();

// Export types
export type { ApiResponse, PaginatedResponse, ApiError };
