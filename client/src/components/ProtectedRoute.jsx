import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Frontend route guard. This only controls navigation/UI;
// the backend still checks the JWT and role on every API call.
export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    // Logged in, but this area belongs to a different role.
    return <Navigate to="/companies" replace />;
  }

  return <Outlet />;
}
