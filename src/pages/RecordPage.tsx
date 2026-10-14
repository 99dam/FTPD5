import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleCheckBig, LoaderCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader, PageContainer } from '@/components/AppHeader';
import { SearchInput } from '@/components/SearchInput';
import { CourtSelector } from '@/components/CourtSelector';
import { StatusFilter } from '@/components/StatusFilter';
import { CaseCard } from '@/components/CaseCard';
import { CaseDetailSheet } from '@/components/CaseDetailSheet';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton } from '@/components/LoadingSkeleton';
import { useCaseFeed, useCaseStats, useCourts } from '@/hooks/queries';
import { useCaseFeedActions, matchesStatus } from '@/hooks/useCaseFeedActions';
import { useCaseFilters } from '@/hooks/useCaseFilters';
import { useDebounce } from '@/hooks/useDebounce';
import { toThaiError } from '@/lib/errors';
import { formatNumber } from '@/lib/utils';
import type { CaseRow, CaseSearchParams } from '@/types';

const SAVED_FLASH_MS = 1000;

export default function RecordPage() {
  const { courtId, status, setCourt, setStatus } = useCaseFilters('incomplete');
  const [search, setSearch] = useState('');
  const query = useDebounce(search.trim(), 350);

  const params = useMemo<CaseSearchParams>(() => ({ query, courtId, status }), [query, courtId, status]);

  const { data: courts } = useCourts();
  const stats = useCaseStats(courtId);
  const feed = useCaseFeed(params);
  const { saveNumbers, setSkipped, removeRow, refetchFeed } = useCaseFeedActions(params);

  const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [detail, setDetail] = useState<CaseRow | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const rows = useMemo(() => {
    const seen = new Set<string>();
    return (feed.data?.pages ?? []).flatMap((p) => p.rows).filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  }, [feed.data]);
  const pages = feed.data?.pages ?? [];
  const total = pages.length ? pages[pages.length - 1].total : 0;

  const toggle = (setter: typeof setSavingIds, id: string, on: boolean) =>
    setter((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const scrollToNext = useCallback(
    (id: string) => {
      const idx = rows.findIndex((r) => r.id === id);
      const next = rows[idx + 1];
      if (!next) return;
      window.requestAnimationFrame(() =>
        document.getElementById(`case-${next.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    },
    [rows],
  );

  const handleSave = async (row: CaseRow, black: string, red: string) => {
    if (savingIds.has(row.id)) return; // double-submit guard
    toggle(setSavingIds, row.id, true);
    try {
      const saved = await saveNumbers(row.id, black, red);
      toggle(setSavedIds, row.id, true);
      const t = window.setTimeout(() => {
        toggle(setSavedIds, row.id, false);
        // Completed rows leave the "ยังไม่ครบ" list after the check animation.
        if (!matchesStatus({ ...row, ...saved }, status)) removeRow(row.id);
      }, SAVED_FLASH_MS);
      timers.current.push(t);
    } catch (err) {
      toast.error(toThaiError(err, { duplicate: 'เลขคดีนี้มีอยู่แล้วในศาลเดียวกัน' }));
    } finally {
      toggle(setSavingIds, row.id, false);
    }
  };

  const handleSkip = async (row: CaseRow) => {
    if (savingIds.has(row.id)) return;
    scrollToNext(row.id);
    try {
      await setSkipped(row.id, true);
      toast('ข้ามรายการแล้ว กลับมาแก้ไขได้ที่ตัวกรอง "ข้าม"', {
        action: {
          label: 'เลิกทำ',
          onClick: () => {
            setSkipped(row.id, false)
              .then(() => refetchFeed())
              .catch((err) => toast.error(toThaiError(err)));
          },
        },
      });
    } catch (err) {
      toast.error(toThaiError(err));
    }
  };

  const handleUnskip = async (row: CaseRow) => {
    try {
      await setSkipped(row.id, false);
      toast.success('ยกเลิกการข้ามแล้ว');
    } catch (err) {
      toast.error(toThaiError(err));
    }
  };

  // Infinite loading: fetch the next page when the sentinel scrolls into view.
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      <AppHeader title="บันทึกเลขคดีดำ / คดีแดง" subtitle="กรอกเลขคดีในการ์ดแล้วกดบันทึกได้ทันที">
        <div className="grid gap-3 sm:grid-cols-2">
          <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาชื่อผู้ถูกกล่าวหา / เลขคดี" onDark />
          <CourtSelector courts={courts} value={courtId} onChange={setCourt} />
        </div>
      </AppHeader>

      <PageContainer className="mt-5">
        <StatusFilter value={status} onChange={setStatus} stats={stats.data} />
        <p className="mt-3 mb-3 text-sm text-muted" aria-live="polite">
          {feed.isPending ? 'กำลังโหลด...' : `แสดง ${formatNumber(rows.length)} จาก ${formatNumber(total)} รายการ`}
        </p>

        {feed.isPending ? (
          <ListSkeleton count={3} />
        ) : feed.isError ? (
          <EmptyState
            icon={RefreshCw}
            title="โหลดข้อมูลไม่สำเร็จ"
            description={toThaiError(feed.error)}
            action={
              <button type="button" className="btn-secondary" onClick={() => void feed.refetch()}>
                <RefreshCw className="size-4" /> ลองใหม่
              </button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={CircleCheckBig}
            title={status === 'incomplete' && !query ? 'ไม่มีรายการที่ต้องบันทึก' : 'ไม่พบรายการ'}
            description={
              status === 'incomplete' && !query
                ? 'รายการในตัวกรองนี้บันทึกครบแล้ว ลองดูรายการที่ "ข้าม" ไว้'
                : 'ลองเปลี่ยนคำค้นหา ศาล หรือสถานะ'
            }
          />
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <CaseCard
                key={`${row.id}:${row.black_case_number ?? ''}:${row.red_case_number ?? ''}`}
                row={row}
                saving={savingIds.has(row.id)}
                justSaved={savedIds.has(row.id)}
                onSave={handleSave}
                onSkip={handleSkip}
                onUnskip={handleUnskip}
                onOpenDetail={setDetail}
              />
            ))}
            <div ref={sentinel} />
            {hasNextPage && (
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage && <LoaderCircle className="size-4 animate-spin" />}
                โหลดรายการเพิ่ม
              </button>
            )}
          </div>
        )}
      </PageContainer>

      <CaseDetailSheet row={detail} onClose={() => setDetail(null)} />
    </>
  );
}
