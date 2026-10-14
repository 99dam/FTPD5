import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';
import { emptyToNull } from '@/lib/utils';
import type { CaseRow, CaseSearchParams, CaseStats, CourtStats, Paged } from '@/types';

type CaseRowWithTotal = CaseRow & { total_count: number };

export async function searchCases(
  params: CaseSearchParams,
  limit: number,
  offset: number,
): Promise<Paged<CaseRow>> {
  const { data, error } = await supabase.rpc('search_cases', {
    p_query: params.query?.trim() || null,
    p_court_id: params.courtId || null,
    p_status: params.status || null,
    p_deleted_only: Boolean(params.deletedOnly),
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  const rows = (data ?? []) as CaseRowWithTotal[];
  return {
    rows: rows.map((r) => {
      const { total_count, ...row } = r;
      void total_count;
      return row;
    }),
    total: rows[0] ? Number(rows[0].total_count) : 0,
  };
}

export async function getCaseStats(courtId?: string | null): Promise<CaseStats> {
  const { data, error } = await supabase.rpc('get_case_stats', { p_court_id: courtId || null });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as CaseStats | undefined;
  return {
    total: Number(row?.total ?? 0),
    complete: Number(row?.complete ?? 0),
    incomplete: Number(row?.incomplete ?? 0),
    skipped: Number(row?.skipped ?? 0),
  };
}

export async function getCourtStats(): Promise<CourtStats[]> {
  const { data, error } = await supabase.rpc('get_court_stats');
  if (error) throw error;
  return ((data ?? []) as CourtStats[]).map((r) => ({
    ...r,
    total: Number(r.total),
    complete: Number(r.complete),
    incomplete: Number(r.incomplete),
    skipped: Number(r.skipped),
  }));
}

/** Throws when RLS filtered the update (0 rows affected). */
function assertUpdated(data: unknown[] | null) {
  if (!data || data.length === 0) throw new AppError('NOT_FOUND');
}

export async function saveCaseNumbers(
  id: string,
  values: { black_case_number: string; red_case_number: string },
) {
  const { data, error } = await supabase
    .from('cases')
    .update({
      black_case_number: emptyToNull(values.black_case_number),
      red_case_number: emptyToNull(values.red_case_number),
    })
    .eq('id', id)
    .select('id, updated_at, is_complete, is_skipped, black_case_number, red_case_number');
  if (error) throw error;
  assertUpdated(data);
  return data![0] as Pick<
    CaseRow,
    'id' | 'updated_at' | 'is_complete' | 'is_skipped' | 'black_case_number' | 'red_case_number'
  >;
}

export async function setCaseSkipped(id: string, skipped: boolean) {
  const { data, error } = await supabase
    .from('cases')
    .update({ is_skipped: skipped })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  assertUpdated(data);
}

export interface CaseInput {
  accused_name: string;
  court_id: string;
  black_case_number: string;
  red_case_number: string;
  note: string;
}

export async function createCase(input: CaseInput) {
  // created_by, status fields, timestamps and sequence are set by the database.
  const { data, error } = await supabase
    .from('cases')
    .insert({
      accused_name: input.accused_name.trim(),
      court_id: input.court_id,
      black_case_number: emptyToNull(input.black_case_number),
      red_case_number: emptyToNull(input.red_case_number),
      note: emptyToNull(input.note),
    })
    .select('id, sequence_number')
    .single();
  if (error) throw error;
  return data as { id: string; sequence_number: number };
}

export interface ImportResult {
  inserted: number;
  failed: Array<{ index: number; error: unknown }>;
}

const IMPORT_BATCH_SIZE = 50;

/**
 * Inserts many cases. Each batch is one request; if a batch is rejected
 * (e.g. one duplicate case number) its rows are retried one by one so the
 * valid rows still go in and each failure is attributed to its row.
 */
export async function importCases(
  inputs: Array<Omit<CaseInput, 'note'> & { note?: string }>,
  onProgress?: (done: number) => void,
): Promise<ImportResult> {
  const toRow = (input: (typeof inputs)[number]) => ({
    accused_name: input.accused_name.trim(),
    court_id: input.court_id,
    black_case_number: emptyToNull(input.black_case_number),
    red_case_number: emptyToNull(input.red_case_number),
    note: emptyToNull(input.note),
  });

  const result: ImportResult = { inserted: 0, failed: [] };
  for (let start = 0; start < inputs.length; start += IMPORT_BATCH_SIZE) {
    const batch = inputs.slice(start, start + IMPORT_BATCH_SIZE);
    const { error } = await supabase.from('cases').insert(batch.map(toRow));
    if (!error) {
      result.inserted += batch.length;
    } else {
      for (let i = 0; i < batch.length; i++) {
        const { error: rowError } = await supabase.from('cases').insert(toRow(batch[i]));
        if (rowError) result.failed.push({ index: start + i, error: rowError });
        else result.inserted += 1;
      }
    }
    onProgress?.(Math.min(start + IMPORT_BATCH_SIZE, inputs.length));
  }
  return result;
}

/** Sends only changed fields. Officers may change numbers and note only (enforced in DB). */
export async function updateCase(id: string, changes: Partial<CaseInput>) {
  const payload: Record<string, string | null> = {};
  if (changes.accused_name !== undefined) payload.accused_name = changes.accused_name.trim();
  if (changes.court_id !== undefined) payload.court_id = changes.court_id;
  if (changes.black_case_number !== undefined) payload.black_case_number = emptyToNull(changes.black_case_number);
  if (changes.red_case_number !== undefined) payload.red_case_number = emptyToNull(changes.red_case_number);
  if (changes.note !== undefined) payload.note = emptyToNull(changes.note);
  if (Object.keys(payload).length === 0) return;

  const { data, error } = await supabase.from('cases').update(payload).eq('id', id).select('id');
  if (error) throw error;
  assertUpdated(data);
}

export async function softDeleteCase(id: string) {
  const { error } = await supabase.rpc('soft_delete_case', { p_case_id: id });
  if (error) throw error;
}

export async function restoreCase(id: string) {
  const { error } = await supabase.rpc('restore_case', { p_case_id: id });
  if (error) throw error;
}
