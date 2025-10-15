import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { toast } from 'sonner';

export type UserRole = 'student' | 'hod' | 'principal';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  section?: 'A' | 'B' | 'C' | 'D';
  regNumber?: string;
  email?: string;
  phone?: string;
  subjects?: string[];
  department?: string; // For HODs
  batchYear?: string; // For students
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  loginStudent: (regNumber: string, dob: string) => Promise<void>;
  loginAdmin: (username: string, password: string) => Promise<void>;
  verifyToken: () => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Check for existing session on mount
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          setIsAuthLoading(true);
          await verifyToken();
        } catch {
          // Token is invalid, clear storage
          logout();
        } finally {
          setIsAuthLoading(false);
        }
      } else {
        setIsAuthLoading(false);
      }
    };
    init();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('feedbackPortalUser', JSON.stringify(userData));
  };

  const verifyToken = async () => {
    try {
      const response = await apiService.verifyToken();
      if (response.success && response.data) {
        const userData: User = {
          id: response.data.user.id,
          role: response.data.user.role,
          name: response.data.user.name,
          section: response.data.user.section,
          regNumber: response.data.user.regNumber,
          email: response.data.user.email,
          phone: response.data.user.phone
        };
        setUser(userData);
        localStorage.setItem('feedbackPortalUser', JSON.stringify(userData));
        return userData;
      } else {
        throw new Error('Invalid token response');
      }
    } catch (error) {
      // Try to refresh token if verification fails
      try {
        console.log('Token verification failed, attempting refresh...');
        await apiService.refreshToken();
        // Retry verification with new token
        const response = await apiService.verifyToken();
        if (response.success && response.data) {
          const userData: User = {
            id: response.data.user.id,
            role: response.data.user.role,
            name: response.data.user.name,
            section: response.data.user.section,
            regNumber: response.data.user.regNumber,
            email: response.data.user.email,
            phone: response.data.user.phone
          };
          setUser(userData);
          localStorage.setItem('feedbackPortalUser', JSON.stringify(userData));
          return userData;
        }
      } catch (refreshError) {
        console.log('Token refresh failed:', refreshError);
        // Both verification and refresh failed, logout user
        logout();
        throw error;
      }
      throw error;
    }
  };

  const loginStudent = async (regNumber: string, dob: string) => {
    try {
      const response = await apiService.loginStudent(regNumber, dob);
      
      if (response.success && response.data) {
        const userData: User = {
          id: response.data.user.id,
          role: 'student',
          name: response.data.user.name,
          section: response.data.user.section as 'A' | 'B' | 'C' | 'D',
          regNumber: response.data.user.regNumber,
          email: response.data.user.email,
          phone: response.data.user.phone,
          batchYear: response.data.user.batchYear
        };
        
        login(userData);
        toast.success('Login successful!');
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      toast.error(errorMessage);
      throw error;
    }
  };

  const loginAdmin = async (username: string, password: string) => {
    try {
      const response = await apiService.loginAdmin(username, password);
      
      if (response.success && response.data) {
        const userData: User = {
          id: response.data.user.id,
          role: response.data.user.role,
          name: response.data.user.name,
          email: response.data.user.email,
          phone: response.data.user.phone,
          department: response.data.user.department
        };
        
        login(userData);
        toast.success('Admin login successful!');
      } else {
        throw new Error(response.message || 'Admin login failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Admin login failed';
      toast.error(errorMessage);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('feedbackPortalUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    apiService.logout();
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated,
      isAuthLoading,
      loginStudent, 
      loginAdmin,
      verifyToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};