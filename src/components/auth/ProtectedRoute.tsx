import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  requiredPermission?: string;
  fallbackPath?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  fallbackPath = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, authUser, hasPermission } = useAuth();
  const location = useLocation();

  // Show loading spinner while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check for required role
  if (requiredRole && authUser) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRequiredRole = roles.includes(authUser.role);
    
    // Also allow higher roles (master_admin can access everything)
    const roleHierarchy: UserRole[] = ['staff', 'manager', 'admin', 'master_admin'];
    const userRoleIndex = roleHierarchy.indexOf(authUser.role);
    const minRequiredIndex = Math.min(...roles.map(r => roleHierarchy.indexOf(r)));
    
    if (!hasRequiredRole && userRoleIndex < minRequiredIndex) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Check for required permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check if user is active
  if (authUser && !authUser.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-xl font-semibold mb-2">Account Inactive</h2>
          <p className="text-muted-foreground">
            Your account has been deactivated. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Higher-order component for role-based access
export function withRole(Component: React.ComponentType, requiredRole: UserRole | UserRole[]) {
  return function WrappedComponent(props: any) {
    return (
      <ProtectedRoute requiredRole={requiredRole}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Higher-order component for permission-based access
export function withPermission(Component: React.ComponentType, permission: string) {
  return function WrappedComponent(props: any) {
    return (
      <ProtectedRoute requiredPermission={permission}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
