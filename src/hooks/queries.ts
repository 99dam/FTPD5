import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getCaseStats, getCourtStats, searchCases } from '@/services/cases';
import { listCourts } from '@/services/courts';
import { listUsers } from '@/services/users';
import { listAuditLogs } from '@/services/audit';
import type { AuditLog, CaseSearchParams } from '@/types';

export const PAGE_SIZE = 20;

export const queryKeys = {
  courts: ['courts'] as const,
  stats: (courtId: string | null) => ['stats', courtId ?? 'all'] as const,
  courtStats: ['court-stats'] as const,
  caseList: (params: CaseSearchParams, page: number) => ['cases', 'list', params, page] as const,
  caseFeed: (params: CaseSearchParams) => ['cases', 'feed', params] as const,
  users: ['users'] as const,
  audit: (entity: string | null, actor: string | null, page: number) => ['audit', entity, actor, page] as const,
};

export function useCourts() {
  return useQuery({ queryKey: queryKeys.courts, queryFn: listCourts, staleTime: 5 * 60_000 });
}

export function useCaseStats(courtId: string | null) {
  return useQuery({
    queryKey: queryKeys.stats(courtId),
    queryFn: () => getCaseStats(courtId),
    placeholderData: keepPreviousData,
  });
}

export function useCourtStats(enabled = true) {
  return useQuery({ queryKey: queryKeys.courtStats, queryFn: getCourtStats, enabled });
}

/** Classic paginated list (cases page). */
export function useCaseList(params: CaseSearchParams, page: number) {
  return useQuery({
    queryKey: queryKeys.caseList(params, page),
    queryFn: () => searchCases(params, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
}

/**
 * Infinite feed (record page). The next offset is the number of rows still in
 * the cache, so rows removed locally after being completed/skipped (and thus
 * no longer matching the server-side filter) do not cause skipped items.
 */
export function useCaseFeed(params: CaseSearchParams) {
  return useInfiniteQuery({
    queryKey: queryKeys.caseFeed(params),
    queryFn: ({ pageParam }) => searchCases(params, PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((n, p) => n + p.rows.length, 0);
      if (lastPage.rows.length === 0) return undefined;
      return loaded < lastPage.total ? loaded : undefined;
    },
  });
}

export function useUsers(enabled: boolean) {
  return useQuery({ queryKey: queryKeys.users, queryFn: listUsers, enabled });
}

export function useAuditLogs(entity: AuditLog['entity_type'] | null, actorId: string | null, page: number, pageSize = 30) {
  return useQuery({
    queryKey: queryKeys.audit(entity, actorId, page),
    queryFn: () =>
      listAuditLogs({ entityType: entity, actorId, limit: pageSize, offset: (page - 1) * pageSize }),
    placeholderData: keepPreviousData,
  });
}
