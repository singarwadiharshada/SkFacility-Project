import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useRole, UserRole } from "@/context/RoleContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, role, loading } = useRole();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    // You can add token verification with backend here if needed
    setIsVerifying(false);
  }, []);

  if (loading || isVerifying) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={`/${role}/dashboard`} replace />;
  }

  return <>{children}</>;
};