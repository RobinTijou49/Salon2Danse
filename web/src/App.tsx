import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Spinner } from './components/ui';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { PlanningPage } from './pages/PlanningPage';
import { RecapPage } from './pages/RecapPage';
import { PhotoGatePage } from './pages/PhotoGatePage';
import { ReactNode } from 'react';

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Chargement…" />;
  if (!user) return <Navigate to="/login" replace />;
  // Photo obligatoire : tant qu'elle manque, on bloque l'accès à l'app.
  if (user.profile && !user.profile.hasPhoto) return <PhotoGatePage />;
  return <AppShell>{children}</AppShell>;
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
        path="/"
        element={
          <Protected>
            <DashboardPage />
          </Protected>
        }
      />
      <Route
        path="/planning"
        element={
          <Protected>
            <PlanningPage />
          </Protected>
        }
      />
      <Route
        path="/recap"
        element={
          <Protected>
            <RecapPage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
