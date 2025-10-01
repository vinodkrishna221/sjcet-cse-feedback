import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isAuthLoading } = useAuth();
  const location = useLocation();

  // Persist last visited protected route
  if (isAuthenticated) {
    try {
      localStorage.setItem('lastVisitedPath', location.pathname + location.search);
    } catch {}
  }

  // Avoid redirecting while auth state is loading
  if (isAuthLoading) {
    return null; // Let parent route render a global loader if any
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;