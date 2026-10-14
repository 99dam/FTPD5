import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CaseStatus } from '@/types';

const COURT_KEY = 'ftpd5.court';
const STATUSES: CaseStatus[] = ['complete', 'incomplete', 'skipped'];

function readStoredCourt(): string | null {
  try {
    return sessionStorage.getItem(COURT_KEY) || null;
  } catch {
    return null;
  }
}

function storeCourt(courtId: string | null) {
  try {
    sessionStorage.setItem(COURT_KEY, courtId ?? '');
  } catch {
    /* storage unavailable: URL still carries the filter */
  }
}

/**
 * Filters live in the URL (shareable, survive refresh, back button works).
 * The selected court is also remembered for the session so it stays put
 * while moving between pages.
 */
export function useCaseFilters(defaultStatus: CaseStatus | null) {
  const [params, setParams] = useSearchParams();

  const courtParam = params.get('court');
  const courtId = courtParam !== null ? courtParam || null : readStoredCourt();

  const statusParam = params.get('status');
  const status: CaseStatus | null =
    statusParam === 'all'
      ? null
      : STATUSES.includes(statusParam as CaseStatus)
        ? (statusParam as CaseStatus)
        : defaultStatus;

  const page = Math.max(1, Number(params.get('page')) || 1);
  const trash = params.get('trash') === '1';

  const update = useCallback(
    (changes: Record<string, string | null>, resetPage = true) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(changes)) {
            if (v === null) next.delete(k);
            else next.set(k, v);
          }
          if (resetPage) next.delete('page');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const setCourt = useCallback(
    (id: string | null) => {
      storeCourt(id);
      update({ court: id ?? '' });
    },
    [update],
  );
  const setStatus = useCallback((s: CaseStatus | null) => update({ status: s ?? 'all' }), [update]);
  const setPage = useCallback((p: number) => update({ page: p > 1 ? String(p) : null }, false), [update]);
  const setTrash = useCallback((on: boolean) => update({ trash: on ? '1' : null }), [update]);

  return { courtId, status, page, trash, setCourt, setStatus, setPage, setTrash };
}
