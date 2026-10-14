import { supabase } from '@/lib/supabase';
import type { AuditLog, Paged } from '@/types';

export async function listAuditLogs(params: {
  entityType?: AuditLog['entity_type'] | null;
  actorId?: string | null;
  limit: number;
  offset: number;
}): Promise<Paged<AuditLog>> {
  const { data, error } = await supabase.rpc('list_audit_logs', {
    p_entity_type: params.entityType ?? null,
    p_actor_id: params.actorId ?? null,
    p_limit: params.limit,
    p_offset: params.offset,
  });
  if (error) throw error;
  const rows = (data ?? []) as Array<AuditLog & { total_count: number }>;
  return {
    rows: rows.map((r) => {
      const { total_count, ...row } = r;
      void total_count;
      return row;
    }),
    total: rows[0] ? Number(rows[0].total_count) : 0,
  };
}
