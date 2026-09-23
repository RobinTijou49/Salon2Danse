import { Navigate, Route, Routes } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from './lib/auth';
import { Spinner } from './components/ui';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { PlanningPage } from './pages/PlanningPage';
import { RecapPage } from './pages/RecapPage';
import { PhotoGatePage } from './pages/PhotoGatePage';
import { VerifyPage } from './pages/VerifyPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AdminShell } from './admin/AdminShell';
import { AdminDashboard } from './admin/AdminDashboard';
import { AdminVolunteers } from './admin/AdminVolunteers';
import { AdminEditions } from './admin/AdminEditions';
import { AdminAudit } from './admin/AdminAudit';

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Chargement…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  // Photo obligatoire : tant qu'elle manque, on bloque l'accès à l'app.
  if (user.profile && !user.profile.hasPhoto) return <PhotoGatePage />;
  return <AppShell>{children}</AppShell>;
}

function ProtectedAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Chargement…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <AdminShell>{children}</AdminShell>;
}

export default function App() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? <Spinner /> : user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={loading ? <Spinner /> : user ? <Navigate to="/" replace /> : <RegisterPage />}
      />
      <Route
        path="/forgot-password"
        element={loading ? <Spinner /> : user ? <Navigate to="/" replace /> : <ForgotPasswordPage />}
      />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      {/* Vérification publique d'un badge (scan du QR) */}
      <Route path="/verify/:token" element={<VerifyPage />} />

      {/* Espace bénévole */}
      <Route path="/" element={<Protected><DashboardPage /></Protected>} />
      <Route path="/planning" element={<Protected><PlanningPage /></Protected>} />
      <Route path="/recap" element={<Protected><RecapPage /></Protected>} />

      {/* Espace administrateur */}
      <Route path="/admin" element={<ProtectedAdmin><AdminDashboard /></ProtectedAdmin>} />
      <Route path="/admin/volunteers" element={<ProtectedAdmin><AdminVolunteers /></ProtectedAdmin>} />
      <Route path="/admin/editions" element={<ProtectedAdmin><AdminEditions /></ProtectedAdmin>} />
      <Route path="/admin/audit" element={<ProtectedAdmin><AdminAudit /></ProtectedAdmin>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
