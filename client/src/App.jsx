import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import CompaniesPage from "./pages/CompaniesPage";
import CompanyDetailsPage from "./pages/CompanyDetailsPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import NotFoundPage from "./pages/NotFoundPage";
import MyApplicationsPage from "./pages/student/MyApplicationsPage";
import CompanyFormPage from "./pages/admin/CompanyFormPage";
import ApplicantsPage from "./pages/admin/ApplicantsPage";
import CompanyUpdatesPage from "./pages/admin/CompanyUpdatesPage";
import AdministratorsPage from "./pages/superadmin/AdministratorsPage";

const STUDENT = ["STUDENT"];
const ADMINS = ["ADMIN", "SUPER_ADMIN"];
const EVERYONE = ["STUDENT", "ADMIN", "SUPER_ADMIN"];

export default function App() {
  const { loading, isAuthenticated } = useAuth();

  // Wait until we know whether the saved token is valid, otherwise the login page would flash.
  if (loading) {
    return (
      <div className="page-loading" style={{ minHeight: "100vh" }}>
        <span className="spinner" /> Loading…
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/companies" replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/companies" replace /> : <RegisterPage />} />

      {/* Everything below needs a logged-in user and renders inside the sidebar layout */}
      <Route element={<ProtectedRoute roles={EVERYONE} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/companies" replace />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/companies/:id" element={<CompanyDetailsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Student only */}
          <Route element={<ProtectedRoute roles={STUDENT} />}>
            <Route path="/my-applications" element={<MyApplicationsPage />} />
          </Route>

          {/* Admin + Super Admin */}
          <Route element={<ProtectedRoute roles={ADMINS} />}>
            <Route path="/companies/new" element={<CompanyFormPage />} />
            <Route path="/companies/:id/edit" element={<CompanyFormPage />} />
            <Route path="/companies/:id/applicants" element={<ApplicantsPage />} />
            <Route path="/updates" element={<CompanyUpdatesPage />} />
          </Route>

          {/* Super Admin only */}
          <Route element={<ProtectedRoute roles={["SUPER_ADMIN"]} />}>
            <Route path="/administrators" element={<AdministratorsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
