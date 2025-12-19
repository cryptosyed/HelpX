import { Navigate } from "react-router-dom";
import { useAuthContext } from "../contexts/AuthContext";

/**
 * Generic route guard.
 * - Redirects to /login if not authenticated
 * - Redirects to / if role is not permitted
 */
export function ProtectedRoute({ children, allowedRoles = [], requireAdmin = false }) {
  const auth = useAuthContext();
  const normalizeRole = (role) => {
    const r = (role || "").toLowerCase();
    return r === "customer" ? "user" : r;
  };
  const currentRole = normalizeRole(auth.role);
  const allowedNormalized = allowedRoles.map((r) => normalizeRole(r));

  if (auth.isLoading) {
    return (
      <div className="glass rounded-xl p-6 text-center text-slate-600">
        Loading...
      </div>
    );
  }

  const user = auth.user;

  if (!user || !auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && currentRole !== "admin") {
    return <Navigate to="/login" replace />;
  }

  if (!requireAdmin && allowedRoles.length > 0 && !allowedNormalized.includes(currentRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
