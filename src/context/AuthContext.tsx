import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'student' | 'hod' | 'principal';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  section?: 'A' | 'B';
  regNumber?: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Hardcoded data for authentication
export const STUDENT_DATA = {
  A: [
    '24G31A0501', '24G31A0502', '24G31A0503', '24G31A0504', '24G31A0505',
    '24G31A0506', '24G31A0507', '24G31A0508', '24G31A0509', '24G31A0510',
    '24G31A0511', '24G31A0512', '24G31A0513', '24G31A0514', '24G31A0515',
    '24G31A0516', '24G31A0517', '24G31A0518', '24G31A0519', '24G31A0520'
  ],
  B: [
    '24G31A0521', '24G31A0522', '24G31A0523', '24G31A0524', '24G31A0525',
    '24G31A0526', '24G31A0527', '24G31A0528', '24G31A0529', '24G31A0530',
    '24G31A0531', '24G31A0532', '24G31A0533', '24G31A0534', '24G31A0535',
    '24G31A0536', '24G31A0537', '24G31A0538', '24G31A0539', '24G31A0540'
  ]
};

export const ADMIN_CREDENTIALS = {
  hod: { username: 'hod_cse', password: 'hod@123', name: 'Dr. CSE HOD' },
  principal: { username: 'principal', password: 'principal@123', name: 'Dr. Principal' }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('feedbackPortalUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('feedbackPortalUser', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('feedbackPortalUser');
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};