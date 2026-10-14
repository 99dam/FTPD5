import { useCallback, useMemo } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { saveCaseNumbers, setCaseSkipped } from '@/services/cases';
import { clearDraft } from '@/lib/drafts';
import { emptyToNull } from '@/lib/utils';
import { queryKeys } from './queries';
import type { CaseRow, CaseSearchParams, CaseStatus, Paged } from '@/types';

type Feed = InfiniteData<Paged<CaseRow>, number>;

export function matchesStatus(
  row: Pick<CaseRow, 'is_complete' | 'is_skipped'>,
  status: CaseStatus | null | undefined,
) {
  if (!status) return true;
  if (status === 'complete') return row.is_complete;
  if (status === 'incomplete') return !row.is_complete && !row.is_skipped;
  return !row.is_complete && row.is_skipped;
}

/**
 * Optimistic actions for the record feed. Each action patches the cached
 * feed immediately, rolls back on failure, and refreshes aggregate stats.
 * `params` must be referentially stable (memoised by the caller).
 */
export function useCaseFeedActions(params: CaseSearchParams) {
  const qc = useQueryClient();
  const key = useMemo(() => queryKeys.caseFeed(params), [params]);

  const patchRow = useCallback(
    (id: string, patch: Partial<CaseRow>) =>
      qc.setQueryData<Feed>(key, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((p) => ({
                ...p,
                rows: p.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
              })),
            }
          : old,
      ),
    [qc, key],
  );

  const removeRow = useCallback(
    (id: string) =>
      qc.setQueryData<Feed>(key, (old) => {
        if (!old || !old.pages.some((p) => p.rows.some((r) => r.id === id))) return old;
        return {
          ...old,
          pages: old.pages.map((p) => ({
            rows: p.rows.filter((r) => r.id !== id),
            total: Math.max(0, p.total - 1),
          })),
        };
      }),
    [qc, key],
  );

  const refreshAggregates = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['stats'] });
    void qc.invalidateQueries({ queryKey: queryKeys.courtStats });
    // Other list views become stale; they refetch when next shown.
    void qc.invalidateQueries({ queryKey: ['cases', 'list'] });
  }, [qc]);

  /** Saves numbers and returns the saved row so the caller can animate & reflow. */
  const saveNumbers = useCallback(
    async (id: string, black: string, red: string) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<Feed>(key);
      const b = emptyToNull(black);
      const r = emptyToNull(red);
      patchRow(id, { black_case_number: b, red_case_number: r, is_complete: Boolean(b && r), is_skipped: false });
      try {
        const saved = await saveCaseNumbers(id, { black_case_number: black, red_case_number: red });
        clearDraft(id);
        patchRow(id, saved);
        return saved;
      } catch (err) {
        qc.setQueryData(key, snapshot); // rollback; the draft stays in the inputs
        throw err;
      } finally {
        refreshAggregates();
      }
    },
    [qc, key, patchRow, refreshAggregates],
  );

  const setSkipped = useCallback(
    async (id: string, skipped: boolean) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<Feed>(key);
      const row = snapshot?.pages.flatMap((p) => p.rows).find((r) => r.id === id);

      if (row && !matchesStatus({ ...row, is_skipped: skipped }, params.status)) removeRow(id);
      else patchRow(id, { is_skipped: skipped });

      try {
        await setCaseSkipped(id, skipped);
      } catch (err) {
        qc.setQueryData(key, snapshot);
        throw err;
      } finally {
        refreshAggregates();
      }
    },
    [qc, key, params.status, patchRow, removeRow, refreshAggregates],
  );

  const refetchFeed = useCallback(() => qc.invalidateQueries({ queryKey: key }), [qc, key]);

  return { saveNumbers, setSkipped, removeRow, refetchFeed };
}
