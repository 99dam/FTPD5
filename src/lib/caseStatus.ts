import type { CaseRow } from '@/types';

export type CaseKind = 'complete' | 'incomplete' | 'skipped' | 'deleted';

/** Display status. Completion is derived from the case numbers; "skipped" is a separate flag. */
export function caseKind(row: Pick<CaseRow, 'is_complete' | 'is_skipped' | 'deleted_at'>): CaseKind {
  if (row.deleted_at) return 'deleted';
  if (row.is_complete) return 'complete';
  return row.is_skipped ? 'skipped' : 'incomplete';
}
