import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { FullScreenLoader } from './FullScreenLoader';
import { Logo } from './Logo';

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

/**
 * UX guard only. Real enforcement happens in the database (RLS + RPC checks);
 * hiding a route here is never relied upon for security.
 */
export function ProtectedRoute({ children, adminOnly }: ProtectedRouteProps) {
  const { session, profile, isAdmin, loading, passwordSetupRequired } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (passwordSetupRequired) return <Navigate to="/set-password" replace />;
  if (!profile || !profile.is_active) return <AccountUnavailable />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}

function AccountUnavailable() {
  const { signOut } = useAuth();
  return (
    <div className="header-gradient grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <Logo size="md" className="mb-6 justify-center" />
        <div className="card p-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-danger-50 text-danger-600">
            <ShieldAlert className="size-7" aria-hidden />
          </span>
          <h1 className="mt-4 text-xl font-extrabold">บัญชียังไม่พร้อมใช้งาน</h1>
          <p className="mt-2 text-sm text-muted">
            บัญชีของคุณถูกปิดใช้งานหรือยังไม่ได้รับการอนุมัติ กรุณาติดต่อผู้ดูแลระบบ
          </p>
          <button type="button" className="btn-navy mt-6 w-full" onClick={() => void signOut()}>
            <LogOut className="size-4" />
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
