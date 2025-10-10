/**
 * Global application store using Zustand
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Types
export interface User {
  id: string;
  role: 'student' | 'hod' | 'principal';
  name: string;
  section?: string;
  regNumber?: string;
  email?: string;
  phone?: string;
  department?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  notifications: Notification[];
  loading: boolean;
  error: string | null;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface FeedbackState {
  currentFeedback: any | null;
  draftFeedback: any | null;
  submittedFeedback: any[];
  isLoading: boolean;
  error: string | null;
}

export interface AppState extends AuthState, UIState, FeedbackState {
  // Auth actions
  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setAuthError: (error: string | null) => void;
  setAuthLoading: (loading: boolean) => void;
  
  // UI actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  setUILoading: (loading: boolean) => void;
  setUIError: (error: string | null) => void;
  
  // Feedback actions
  setCurrentFeedback: (feedback: any) => void;
  setDraftFeedback: (feedback: any) => void;
  addSubmittedFeedback: (feedback: any) => void;
  setFeedbackLoading: (loading: boolean) => void;
  setFeedbackError: (error: string | null) => void;
  clearFeedback: () => void;
  
  // Utility actions
  reset: () => void;
}

// Initial state
const initialAuthState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const initialUIState: UIState = {
  theme: 'system',
  sidebarOpen: false,
  notifications: [],
  loading: false,
  error: null,
};

const initialFeedbackState: FeedbackState = {
  currentFeedback: null,
  draftFeedback: null,
  submittedFeedback: [],
  isLoading: false,
  error: null,
};

// Store implementation
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialAuthState,
        ...initialUIState,
        ...initialFeedbackState,

        // Auth actions
        login: (user, token, refreshToken) => {
          set((state) => {
            state.user = user;
            state.token = token;
            state.refreshToken = refreshToken;
            state.isAuthenticated = true;
            state.isLoading = false;
            state.error = null;
          });
        },

        logout: () => {
          set((state) => {
            state.user = null;
            state.token = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            state.error = null;
            state.currentFeedback = null;
            state.draftFeedback = null;
            state.submittedFeedback = [];
            state.notifications = [];
          });
        },

        updateUser: (userData) => {
          set((state) => {
            if (state.user) {
              state.user = { ...state.user, ...userData };
            }
          });
        },

        setAuthError: (error) => {
          set((state) => {
            state.error = error;
            state.isLoading = false;
          });
        },

        setAuthLoading: (loading) => {
          set((state) => {
            state.isLoading = loading;
          });
        },

        // UI actions
        setTheme: (theme) => {
          set((state) => {
            state.theme = theme;
          });
        },

        toggleSidebar: () => {
          set((state) => {
            state.sidebarOpen = !state.sidebarOpen;
          });
        },

        setSidebarOpen: (open) => {
          set((state) => {
            state.sidebarOpen = open;
          });
        },

        addNotification: (notification) => {
          set((state) => {
            const newNotification: Notification = {
              ...notification,
              id: Date.now().toString(),
              timestamp: new Date(),
            };
            state.notifications.unshift(newNotification);
            
            // Keep only last 50 notifications
            if (state.notifications.length > 50) {
              state.notifications = state.notifications.slice(0, 50);
            }
          });
        },

        removeNotification: (id) => {
          set((state) => {
            state.notifications = state.notifications.filter(n => n.id !== id);
          });
        },

        markNotificationRead: (id) => {
          set((state) => {
            const notification = state.notifications.find(n => n.id === id);
            if (notification) {
              notification.read = true;
            }
          });
        },

        clearNotifications: () => {
          set((state) => {
            state.notifications = [];
          });
        },

        setUILoading: (loading) => {
          set((state) => {
            state.loading = loading;
          });
        },

        setUIError: (error) => {
          set((state) => {
            state.error = error;
          });
        },

        // Feedback actions
        setCurrentFeedback: (feedback) => {
          set((state) => {
            state.currentFeedback = feedback;
          });
        },

        setDraftFeedback: (feedback) => {
          set((state) => {
            state.draftFeedback = feedback;
          });
        },

        addSubmittedFeedback: (feedback) => {
          set((state) => {
            state.submittedFeedback.unshift(feedback);
          });
        },

        setFeedbackLoading: (loading) => {
          set((state) => {
            state.isLoading = loading;
          });
        },

        setFeedbackError: (error) => {
          set((state) => {
            state.error = error;
          });
        },

        clearFeedback: () => {
          set((state) => {
            state.currentFeedback = null;
            state.draftFeedback = null;
            state.submittedFeedback = [];
            state.isLoading = false;
            state.error = null;
          });
        },

        // Utility actions
        reset: () => {
          set((state) => {
            Object.assign(state, {
              ...initialAuthState,
              ...initialUIState,
              ...initialFeedbackState,
            });
          });
        },
      })),
      {
        name: 'app-store',
        partialize: (state) => ({
          user: state.user,
          token: state.token,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    {
      name: 'app-store',
    }
  )
);

// Selectors for better performance
export const useAuth = () => useAppStore((state) => ({
  user: state.user,
  token: state.token,
  refreshToken: state.refreshToken,
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  error: state.error,
  login: state.login,
  logout: state.logout,
  updateUser: state.updateUser,
  setAuthError: state.setAuthError,
  setAuthLoading: state.setAuthLoading,
}));

export const useUI = () => useAppStore((state) => ({
  theme: state.theme,
  sidebarOpen: state.sidebarOpen,
  notifications: state.notifications,
  loading: state.loading,
  error: state.error,
  setTheme: state.setTheme,
  toggleSidebar: state.toggleSidebar,
  setSidebarOpen: state.setSidebarOpen,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  markNotificationRead: state.markNotificationRead,
  clearNotifications: state.clearNotifications,
  setUILoading: state.setUILoading,
  setUIError: state.setUIError,
}));

export const useFeedback = () => useAppStore((state) => ({
  currentFeedback: state.currentFeedback,
  draftFeedback: state.draftFeedback,
  submittedFeedback: state.submittedFeedback,
  isLoading: state.isLoading,
  error: state.error,
  setCurrentFeedback: state.setCurrentFeedback,
  setDraftFeedback: state.setDraftFeedback,
  addSubmittedFeedback: state.addSubmittedFeedback,
  setFeedbackLoading: state.setFeedbackLoading,
  setFeedbackError: state.setFeedbackError,
  clearFeedback: state.clearFeedback,
}));

// Utility hooks
export const useNotifications = () => useAppStore((state) => state.notifications);
export const useUnreadNotifications = () => useAppStore((state) => 
  state.notifications.filter(n => !n.read)
);
export const useUnreadCount = () => useAppStore((state) => 
  state.notifications.filter(n => !n.read).length
);
