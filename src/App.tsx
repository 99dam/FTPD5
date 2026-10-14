import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { useAuth } from '@/hooks/useAuth';

// Route-based code splitting
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const SetPasswordPage = lazy(() => import('@/pages/SetPasswordPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const RecordPage = lazy(() => import('@/pages/RecordPage'));
const CasesPage = lazy(() => import('@/pages/CasesPage'));
const CourtsPage = lazy(() => import('@/pages/CourtsPage'));
const UsersPage = lazy(() => import('@/pages/UsersPage'));
const AccountPage = lazy(() => import('@/pages/AccountPage'));
const AuditLogsPage = lazy(() => import('@/pages/AuditLogsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function PublicOnly({ children }: { children: ReactNode }) {
  const { session, loading, passwordSetupRequired } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (session && passwordSetupRequired) return <Navigate to="/set-password" replace />;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicOnly>
              <ForgotPasswordPage />
            </PublicOnly>
          }
        />
        <Route path="/set-password" element={<SetPasswordPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="record" element={<RecordPage />} />
          <Route path="cases" element={<CasesPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route
            path="courts"
            element={
              <ProtectedRoute adminOnly>
                <CourtsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute adminOnly>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="audit"
            element={
              <ProtectedRoute adminOnly>
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
