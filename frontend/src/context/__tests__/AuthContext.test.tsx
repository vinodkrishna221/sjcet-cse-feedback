/**
 * Unit tests for AuthContext
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import * as apiService from '../services/api';

// Mock API service
jest.mock('../services/api');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Test component that uses auth context
const TestComponent: React.FC = () => {
  const { user, login, logout, isLoading } = React.useContext(require('../context/AuthContext').AuthContext);
  
  return (
    <div>
      <div data-testid="user">{user ? user.email : 'No user'}</div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not loading'}</div>
      <button data-testid="login" onClick={() => login('test@example.com', 'password')}>
        Login
      </button>
      <button data-testid="logout" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should initialize with no user', () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    expect(screen.getByTestId('user')).toHaveTextContent('No user');
    expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
  });

  it('should login successfully', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'admin',
      name: 'Test User'
    };

    mockApiService.login.mockResolvedValue({
      success: true,
      data: {
        user: mockUser,
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token'
      }
    });

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('login'));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    expect(mockApiService.login).toHaveBeenCalledWith('test@example.com', 'password');
    expect(localStorage.setItem).toHaveBeenCalledWith('access_token', 'mock-token');
    expect(localStorage.setItem).toHaveBeenCalledWith('refresh_token', 'mock-refresh-token');
  });

  it('should handle login failure', async () => {
    mockApiService.login.mockRejectedValue(new Error('Login failed'));

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('login'));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
    });

    expect(mockApiService.login).toHaveBeenCalledWith('test@example.com', 'password');
  });

  it('should logout successfully', async () => {
    // First login
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'admin',
      name: 'Test User'
    };

    mockApiService.login.mockResolvedValue({
      success: true,
      data: {
        user: mockUser,
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token'
      }
    });

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('login'));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    // Then logout
    fireEvent.click(screen.getByTestId('logout'));

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
    });

    expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('refresh_token');
  });

  it('should restore user from localStorage on mount', () => {
    localStorage.setItem('access_token', 'mock-token');
    localStorage.setItem('refresh_token', 'mock-refresh-token');

    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'admin',
      name: 'Test User'
    };

    mockApiService.getCurrentUser.mockResolvedValue({
      success: true,
      data: mockUser
    });

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    // Should show loading initially
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');
  });

  it('should handle token refresh', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'admin',
      name: 'Test User'
    };

    mockApiService.refreshToken.mockResolvedValue({
      success: true,
      data: {
        access_token: 'new-token',
        refresh_token: 'new-refresh-token'
      }
    });

    mockApiService.getCurrentUser.mockResolvedValue({
      success: true,
      data: mockUser
    });

    localStorage.setItem('access_token', 'expired-token');
    localStorage.setItem('refresh_token', 'refresh-token');

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockApiService.refreshToken).toHaveBeenCalled();
    });
  });
});
