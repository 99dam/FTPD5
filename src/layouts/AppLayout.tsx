import { Suspense, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { BottomNavigation } from '@/components/BottomNavigation';
import { PageSkeleton } from '@/components/LoadingSkeleton';
import { useAuth } from '@/hooks/useAuth';
import { useIdleLogout } from '@/hooks/useIdleLogout';
import { env } from '@/lib/env';

export function AppLayout() {
  const { session, signOut } = useAuth();

  const onIdle = useCallback(() => {
    void signOut().then(() => toast.info('ออกจากระบบอัตโนมัติเนื่องจากไม่มีการใช้งาน'));
  }, [signOut]);

  useIdleLogout(Boolean(session), env.idleTimeoutMinutes, onIdle);

  return (
    <div className="min-h-dvh lg:pl-72">
      <Sidebar />
      <main className="pb-28 lg:pb-12">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNavigation />
    </div>
  );
}
