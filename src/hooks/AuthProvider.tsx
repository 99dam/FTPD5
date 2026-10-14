import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { initialAuthRedirectType, supabase } from '@/lib/supabase';
import { getProfile } from '@/services/users';
import { clearAllDrafts } from '@/lib/drafts';
import { AuthContext, type AuthContextValue } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [passwordSetupRequired, setPasswordSetupRequired] = useState(
    initialAuthRedirectType === 'recovery' || initialAuthRedirectType === 'invite',
  );

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setInitializing(false);
    });

    // Do not call other Supabase methods inside this callback (can deadlock).
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setPasswordSetupRequired(true);
      if (event === 'SIGNED_OUT') {
        setPasswordSetupRequired(false);
        clearAllDrafts();
        queryClient.clear();
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const userId = session?.user.id ?? null;

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => getProfile(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
    // Re-check periodically so a deactivated account is locked out promptly.
    refetchInterval: 5 * 60_000,
  });

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    clearAllDrafts();
    queryClient.clear();
  }, [queryClient]);

  const refreshProfile = useCallback(async () => {
    await profileQuery.refetch();
  }, [profileQuery]);

  const completePasswordSetup = useCallback(() => setPasswordSetupRequired(false), []);

  const profile = profileQuery.data ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isAdmin: Boolean(profile?.is_active && profile.role === 'admin'),
      loading: initializing || (Boolean(userId) && profileQuery.isPending),
      profileError: profileQuery.isError,
      passwordSetupRequired,
      completePasswordSetup,
      signOut,
      refreshProfile,
    }),
    [
      session,
      profile,
      initializing,
      userId,
      profileQuery.isPending,
      profileQuery.isError,
      passwordSetupRequired,
      completePasswordSetup,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
