import { Suspense, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { BottomNavigation } from '@/components/BottomNavigation';
import { PageSkeleton } from '@/components/LoadingSkeleton';
import { useAuth } from '@/hooks/useAuth';
import { useIdleLogout } from '@/hooks/useIdleLogout';
import { env } from '@/lib/env';

export function AppLayout() {
  const { session, signOut } = useAuth();
  const { pathname } = useLocation();

  const onIdle = useCallback(() => {
    void signOut().then(() => toast.info('ออกจากระบบอัตโนมัติเนื่องจากไม่มีการใช้งาน'));
  }, [signOut]);

  useIdleLogout(Boolean(session), env.idleTimeoutMinutes, onIdle);

  return (
    <div className="min-h-dvh lg:pl-72">
      <Sidebar />
      <main key={pathname} className="pb-28 animate-page-in lg:pb-12">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNavigation />
    </div>
  );
}
