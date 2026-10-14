import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import type { Court } from '@/types';

export async function listCourts(): Promise<Court[]> {
  const { data, error } = await supabase
    .from('courts')
    .select('id, name, is_active, created_at, updated_at')
    .order('name', { ascending: true })
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as Court[];
}

export async function createCourt(name: string) {
  const { error } = await supabase.from('courts').insert({ name: name.trim() });
  if (error) throw error;
}

export async function updateCourt(id: string, changes: { name?: string; is_active?: boolean }) {
  const payload: { name?: string; is_active?: boolean } = {};
  if (changes.name !== undefined) payload.name = changes.name.trim();
  if (changes.is_active !== undefined) payload.is_active = changes.is_active;

  const { data, error } = await supabase.from('courts').update(payload).eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new AppError('FORBIDDEN');
}
