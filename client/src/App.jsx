import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterInstitutionPage from './pages/auth/RegisterInstitutionPage';

// Institution Pages
import InstitutionDashboard from './pages/institution/InstitutionDashboard';
import SubmitFDRPage from './pages/institution/SubmitFDRPage';
import MyFDRsPage from './pages/institution/MyFDRsPage';
import FDRDetailsPage from './pages/institution/FDRDetailsPage';
import RequestsHistoryPage from './pages/institution/RequestsHistoryPage';
import ProfilePage from './pages/institution/ProfilePage';

// Officer Pages
import OfficerDashboard from './pages/officer/OfficerDashboard';
import PendingVerificationsPage from './pages/officer/PendingVerificationsPage';
import DiscrepancyQueuePage from './pages/officer/DiscrepancyQueuePage';
import ReleaseReviewPage from './pages/officer/ReleaseReviewPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ReleaseAuthorizationPage from './pages/admin/ReleaseAuthorizationPage';
import AllFDRsPage from './pages/admin/AllFDRsPage';
import SystemAuditLogsPage from './pages/admin/SystemAuditLogsPage';
import InstitutionDirectoryPage from './pages/admin/InstitutionDirectoryPage';
import AnalyticsReportsPage from './pages/admin/AnalyticsReportsPage';

// Common Pages
import UnauthorizedPage from './pages/common/UnauthorizedPage';
import NotFoundPage from './pages/common/NotFoundPage';

// Root Dispatcher
const RootRedirect = () => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'institution') return <Navigate to="/institution/dashboard" replace />;
  if (role === 'officer') return <Navigate to="/officer/dashboard" replace />;
  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterInstitutionPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Institution Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['institution']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/institution/dashboard" element={<InstitutionDashboard />} />
                <Route path="/institution/submit-fdr" element={<SubmitFDRPage />} />
                <Route path="/institution/my-fdrs" element={<MyFDRsPage />} />
                <Route path="/institution/fdrs/:id" element={<FDRDetailsPage />} />
                <Route path="/institution/requests" element={<RequestsHistoryPage />} />
                <Route path="/institution/profile" element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Officer Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['officer', 'admin']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/officer/dashboard" element={<OfficerDashboard />} />
                <Route path="/officer/pending" element={<PendingVerificationsPage />} />
                <Route path="/officer/discrepancies" element={<DiscrepancyQueuePage />} />
                <Route path="/officer/release-reviews" element={<ReleaseReviewPage />} />
                <Route path="/officer/institutions" element={<InstitutionDirectoryPage />} />
                <Route path="/officer/audit-logs" element={<SystemAuditLogsPage />} />
              </Route>
            </Route>

            {/* Admin Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/release-authorization" element={<ReleaseAuthorizationPage />} />
                <Route path="/admin/all-fdrs" element={<AllFDRsPage />} />
                <Route path="/admin/institutions" element={<InstitutionDirectoryPage />} />
                <Route path="/admin/analytics" element={<AnalyticsReportsPage />} />
                <Route path="/admin/audit-logs" element={<SystemAuditLogsPage />} />
              </Route>
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
