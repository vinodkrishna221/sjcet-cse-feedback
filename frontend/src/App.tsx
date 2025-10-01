import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";

// Pages
import Landing from "./pages/Landing";
import StudentLogin from "./pages/StudentLogin";
import AdminLogin from "./pages/AdminLogin";
import FeedbackForm from "./pages/FeedbackForm";
import HODDashboard from "./pages/HODDashboard";
import PrincipalDashboard from "./pages/PrincipalDashboard";
import NotFound from "./pages/NotFound";

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
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RouteRestorer />
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
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
