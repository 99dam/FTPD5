import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import type { Profile, Role } from '@/types';

const PROFILE_COLUMNS = 'id, full_name, email, role, is_active, created_at, updated_at';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

/** Admin only (RLS returns just the caller's own row for officers). */
export async function listUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function adminUpdateUser(
  userId: string,
  changes: { full_name?: string; role?: Role; is_active?: boolean },
) {
  const { error } = await supabase.rpc('admin_update_user', {
    p_user_id: userId,
    p_full_name: changes.full_name ?? null,
    p_role: changes.role ?? null,
    p_is_active: changes.is_active ?? null,
  });
  if (error) throw error;
}

export async function updateMyProfile(fullName: string) {
  const { error } = await supabase.rpc('update_my_profile', { p_full_name: fullName.trim() });
  if (error) throw error;
}

/** Account creation runs server-side in the invite-user Edge Function. */
export async function inviteUser(input: { email: string; full_name: string; role: Role }) {
  const { error } = await supabase.functions.invoke('invite-user', { body: input });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      throw new AppError(body?.error ?? 'INVITE_FAILED');
    }
    throw error;
  }
}
