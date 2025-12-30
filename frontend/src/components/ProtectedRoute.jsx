import { Navigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

export function ProtectedRoute({ children, allowedRoles }) {
  const auth = useAuthContext();

  // Still restoring token from localStorage
  if (auth.isLoading) {
    return null;
  }

  // Not logged in
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role-based protection
  if (allowedRoles && allowedRoles.length > 0) {
    const role = auth.role?.toLowerCase();

    if (!role || !allowedRoles.map(r => r.toLowerCase()).includes(role)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}