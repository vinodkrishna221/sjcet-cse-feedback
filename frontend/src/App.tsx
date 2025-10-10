import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { DashboardSkeleton } from "@/components/shared/LoadingSkeleton";
import { SkipLink } from "@/components/ui/accessibility";

// Lazy load pages for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const StudentLogin = lazy(() => import("./pages/StudentLogin"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const FeedbackForm = lazy(() => import("./pages/FeedbackForm"));
const HODDashboard = lazy(() => import("./pages/HODDashboard"));
const PrincipalDashboard = lazy(() => import("./pages/PrincipalDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteRestorer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // On initial load of the app, restore last visited path if exists and we're at root
  React.useEffect(() => {
    // Only attempt restore on first mount at root path
    if (location.pathname === "/") {
      const lastPath = localStorage.getItem('lastVisitedPath');
      if (lastPath && typeof lastPath === 'string' && lastPath !== "/") {
        try {
          navigate(lastPath, { replace: true });
        } catch {}
      }
    }
  }, []);

  return null;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="feedback-ui-theme">
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <SkipLink href="#main-content">Skip to main content</SkipLink>
              <RouteRestorer />
              <Suspense fallback={<DashboardSkeleton />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/student-login" element={<StudentLogin />} />
                  <Route path="/admin-login" element={<AdminLogin />} />
                  
                  {/* Protected Student Routes */}
                  <Route 
                    path="/feedback" 
                    element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <FeedbackForm />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Protected Admin Routes */}
                  <Route 
                    path="/hod-dashboard" 
                    element={
                      <ProtectedRoute allowedRoles={['hod']}>
                        <HODDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/principal-dashboard" 
                    element={
                      <ProtectedRoute allowedRoles={['principal']}>
                        <PrincipalDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Catch-all routes */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
