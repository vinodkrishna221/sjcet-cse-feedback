import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'student' | 'hod' | 'principal';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  section?: 'A' | 'B';
  regNumber?: string;
  email?: string;
  phone?: string;
  subjects?: string[];
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

// Student details with additional information
export interface StudentDetails {
  regNumber: string;
  name: string;
  section: string;
  dob: string;
  email?: string;
  phone?: string;
}

// Hardcoded student details data
export const STUDENT_DETAILS: StudentDetails[] = [
  // Section A students
  { regNumber: '24G31A0501', name: 'Aditya Kumar', section: 'A', dob: '2003-05-15', email: 'aditya.k@example.com', phone: '9876543201' },
  { regNumber: '24G31A0502', name: 'Bhavya Sharma', section: 'A', dob: '2003-06-22', email: 'bhavya.s@example.com', phone: '9876543202' },
  { regNumber: '24G31A0503', name: 'Chetan Reddy', section: 'A', dob: '2003-07-10', email: 'chetan.r@example.com', phone: '9876543203' },
  { regNumber: '24G31A0504', name: 'Divya Patel', section: 'A', dob: '2003-08-05', email: 'divya.p@example.com', phone: '9876543204' },
  // Section B students
  { regNumber: '24G31A0521', name: 'Kiran Rao', section: 'B', dob: '2003-01-07', email: 'kiran.r@example.com', phone: '9876543221' },
  { regNumber: '24G31A0522', name: 'Lakshmi Devi', section: 'B', dob: '2003-02-14', email: 'lakshmi.d@example.com', phone: '9876543222' },
  { regNumber: '24G31A0523', name: 'Mohan Kumar', section: 'B', dob: '2003-03-21', email: 'mohan.k@example.com', phone: '9876543223' },
];

// Hardcoded student DOB data (registration number -> DOB in YYYY-MM-DD format)
export const STUDENT_DOB_DATA: Record<string, string> = {
  // Section A
  '24G31A0501': '2003-05-15',
  '24G31A0502': '2003-06-22',
  '24G31A0503': '2003-07-10',
  '24G31A0504': '2003-08-05',
  '24G31A0505': '2003-09-18',
  '24G31A0506': '2003-10-27',
  '24G31A0507': '2003-11-14',
  '24G31A0508': '2003-12-03',
  '24G31A0509': '2004-01-21',
  '24G31A0510': '2004-02-08',
  '24G31A0511': '2004-03-17',
  '24G31A0512': '2004-04-25',
  '24G31A0513': '2004-05-12',
  '24G31A0514': '2004-06-30',
  '24G31A0515': '2004-07-19',
  '24G31A0516': '2004-08-24',
  '24G31A0517': '2004-09-11',
  '24G31A0518': '2004-10-05',
  '24G31A0519': '2004-11-22',
  '24G31A0520': '2004-12-15',
  
  // Section B
  '24G31A0521': '2003-01-07',
  '24G31A0522': '2003-02-14',
  '24G31A0523': '2003-03-21',
  '24G31A0524': '2003-04-18',
  '24G31A0525': '2003-05-25',
  '24G31A0526': '2003-06-12',
  '24G31A0527': '2003-07-29',
  '24G31A0528': '2003-08-16',
  '24G31A0529': '2003-09-03',
  '24G31A0530': '2003-10-10',
  '24G31A0531': '2003-11-27',
  '24G31A0532': '2003-12-14',
  '24G31A0533': '2004-01-01',
  '24G31A0534': '2004-02-18',
  '24G31A0535': '2004-03-05',
  '24G31A0536': '2004-04-12',
  '24G31A0537': '2004-05-29',
  '24G31A0538': '2004-06-16',
  '24G31A0539': '2004-07-23',
  '24G31A0540': '2004-08-10'
};

// Teacher details with additional information
export interface TeacherDetails {
  id: string;
  name: string;
  subjects: string[];
  sections: string[];
  email?: string;
  phone?: string;
}

// Hardcoded teacher details data
export const TEACHER_DETAILS: TeacherDetails[] = [
  { id: 'T001', name: 'Dr. Rajesh Kumar', subjects: ['Data Structures', 'Algorithms'], sections: ['A', 'B'], email: 'rajesh.k@example.com', phone: '9876543101' },
  { id: 'T002', name: 'Prof. Meena Sharma', subjects: ['Database Systems'], sections: ['A'], email: 'meena.s@example.com', phone: '9876543102' },
  { id: 'T003', name: 'Dr. Suresh Patel', subjects: ['Computer Networks'], sections: ['B'], email: 'suresh.p@example.com', phone: '9876543103' },
  { id: 'T004', name: 'Prof. Anita Desai', subjects: ['Operating Systems'], sections: ['A', 'B'], email: 'anita.d@example.com', phone: '9876543104' },
  { id: 'T005', name: 'Dr. Vikram Singh', subjects: ['Software Engineering'], sections: ['A'], email: 'vikram.s@example.com', phone: '9876543105' },
  { id: 'T006', name: 'Prof. Priya Gupta', subjects: ['Web Technologies', 'UI/UX Design'], sections: ['A'], email: 'priya.g@example.com', phone: '9876543106' },
  { id: 'T007', name: 'Dr. Arun Verma', subjects: ['Data Structures', 'Discrete Mathematics'], sections: ['B'], email: 'arun.v@example.com', phone: '9876543107' },
];

export const ADMIN_CREDENTIALS = {
  hod: { username: 'hod_cse', password: 'hod@123', name: 'Dr. CSE HOD' },
  principal: { username: 'principal', password: 'principal@123', name: 'Dr. Principal' }
};

// Teacher-Subject mapping for sections
export const TEACHERS_DATA = {
  A: [
    { id: 'T001', name: 'Dr. A. Kumar', subject: 'Data Structures', sections: ['A' as const] },
    { id: 'T002', name: 'Prof. B. Sharma', subject: 'Computer Networks', sections: ['A' as const] },
    { id: 'T003', name: 'Dr. C. Patel', subject: 'Operating Systems', sections: ['A' as const] },
    { id: 'T004', name: 'Prof. D. Singh', subject: 'Database Management Systems', sections: ['A' as const] },
    { id: 'T005', name: 'Dr. E. Reddy', subject: 'Software Engineering', sections: ['A' as const] },
    { id: 'T006', name: 'Prof. F. Gupta', subject: 'Web Technologies', sections: ['A' as const] }
  ],
  B: [
    { id: 'T007', name: 'Dr. G. Verma', subject: 'Data Structures', sections: ['B' as const] },
    { id: 'T008', name: 'Prof. H. Joshi', subject: 'Computer Networks', sections: ['B' as const] },
    { id: 'T009', name: 'Dr. I. Agarwal', subject: 'Operating Systems', sections: ['B' as const] },
    { id: 'T010', name: 'Prof. J. Mehta', subject: 'Database Management Systems', sections: ['B' as const] },
    { id: 'T011', name: 'Dr. K. Rao', subject: 'Software Engineering', sections: ['B' as const] },
    { id: 'T012', name: 'Prof. L. Nair', subject: 'Web Technologies', sections: ['B' as const] }
  ]
} as const;

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