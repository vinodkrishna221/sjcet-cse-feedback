/**
 * Unit tests for API service
 */
import { ApiService } from '../api';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('ApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: '1', email: 'test@example.com', role: 'admin' },
          access_token: 'mock-token',
          refresh_token: 'mock-refresh-token'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await ApiService.login('test@example.com', 'password');

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password',
        }),
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle login failure', async () => {
      const mockResponse = {
        success: false,
        message: 'Invalid credentials'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => mockResponse,
      } as Response);

      await expect(ApiService.login('test@example.com', 'wrong-password'))
        .rejects.toThrow('Invalid credentials');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(ApiService.login('test@example.com', 'password'))
        .rejects.toThrow('Network error');
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const mockUser = { id: '1', email: 'test@example.com', role: 'admin' };
      const mockResponse = { success: true, data: mockUser };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      localStorage.setItem('access_token', 'mock-token');

      const result = await ApiService.getCurrentUser();

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle unauthorized response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false, message: 'Unauthorized' }),
      } as Response);

      localStorage.setItem('access_token', 'invalid-token');

      await expect(ApiService.getCurrentUser())
        .rejects.toThrow('Unauthorized');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          access_token: 'new-token',
          refresh_token: 'new-refresh-token'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      localStorage.setItem('refresh_token', 'old-refresh-token');

      const result = await ApiService.refreshToken();

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: 'old-refresh-token',
        }),
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('getStudents', () => {
    it('should get students with pagination', async () => {
      const mockStudents = [
        { id: '1', name: 'Student 1', reg_number: 'REG001' },
        { id: '2', name: 'Student 2', reg_number: 'REG002' }
      ];

      const mockResponse = {
        success: true,
        data: {
          items: mockStudents,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            pages: 1
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      localStorage.setItem('access_token', 'mock-token');

      const result = await ApiService.getStudents({ page: 1, limit: 10 });

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/students/?page=1&limit=10', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
      });

      expect(result).toEqual(mockResponse);
    });

    it('should get students with filters', async () => {
      const mockResponse = { success: true, data: { items: [], pagination: {} } };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      localStorage.setItem('access_token', 'mock-token');

      await ApiService.getStudents({ 
        page: 1, 
        limit: 10, 
        department: 'CSE',
        section: 'A'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/students/?page=1&limit=10&department=CSE&section=A',
        expect.any(Object)
      );
    });
  });

  describe('createStudent', () => {
    it('should create student successfully', async () => {
      const studentData = {
        name: 'New Student',
        reg_number: 'REG003',
        section: 'A',
        department: 'CSE',
        batch_year: '2023'
      };

      const mockResponse = {
        success: true,
        data: { id: '3', ...studentData }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      localStorage.setItem('access_token', 'mock-token');

      const result = await ApiService.createStudent(studentData);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/students/', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData),
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateStudent', () => {
    it('should update student successfully', async () => {
      const updateData = { name: 'Updated Student' };
      const mockResponse = {
        success: true,
        data: { id: '1', ...updateData }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      localStorage.setItem('access_token', 'mock-token');

      const result = await ApiService.updateStudent('1', updateData);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/students/1', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteStudent', () => {
    it('should delete student successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Student deleted successfully'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      localStorage.setItem('access_token', 'mock-token');

      const result = await ApiService.deleteStudent('1');

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/students/1', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('submitFeedback', () => {
    it('should submit feedback successfully', async () => {
      const feedbackData = {
        student_section: 'A',
        semester: '1',
        academic_year: '2023-24',
        faculty_feedbacks: [],
        is_anonymous: true
      };

      const mockResponse = {
        success: true,
        data: { id: 'feedback-1', ...feedbackData }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      localStorage.setItem('access_token', 'mock-token');

      const result = await ApiService.submitFeedback(feedbackData);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/feedback/submit', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('error handling', () => {
    it('should handle 400 Bad Request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ success: false, message: 'Bad Request' }),
      } as Response);

      await expect(ApiService.getStudents())
        .rejects.toThrow('Bad Request');
    });

    it('should handle 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ success: false, message: 'Internal Server Error' }),
      } as Response);

      await expect(ApiService.getStudents())
        .rejects.toThrow('Internal Server Error');
    });

    it('should handle JSON parse error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); },
      } as Response);

      await expect(ApiService.getStudents())
        .rejects.toThrow('Invalid JSON');
    });
  });
});
