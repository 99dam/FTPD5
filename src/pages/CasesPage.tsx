import { useMemo, useState } from 'react';
import { FileSpreadsheet, FolderSearch, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { AppHeader, PageContainer } from '@/components/AppHeader';
import { SearchInput } from '@/components/SearchInput';
import { CourtSelector } from '@/components/CourtSelector';
import { StatusFilter } from '@/components/StatusFilter';
import { CaseListItem } from '@/components/CaseListItem';
import { CaseDetailSheet } from '@/components/CaseDetailSheet';
import { CaseFormSheet } from '@/components/CaseFormSheet';
import { ImportCasesSheet } from '@/components/ImportCasesSheet';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton } from '@/components/LoadingSkeleton';
import { Pagination } from '@/components/Pagination';
import { useAuth } from '@/hooks/useAuth';
import { PAGE_SIZE, useCaseList, useCaseStats, useCourts } from '@/hooks/queries';
import { useCaseFilters } from '@/hooks/useCaseFilters';
import { useDebounce } from '@/hooks/useDebounce';
import { toThaiError } from '@/lib/errors';
import { cn, formatNumber } from '@/lib/utils';
import type { CaseRow, CaseSearchParams } from '@/types';

export default function CasesPage() {
  const { isAdmin } = useAuth();
  const { courtId, status, page, trash, setCourt, setStatus, setPage, setTrash } = useCaseFilters(null);
  const [search, setSearch] = useState('');
  const query = useDebounce(search.trim(), 350);
  const [selected, setSelected] = useState<CaseRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  const inTrash = isAdmin && trash;
  const params = useMemo<CaseSearchParams>(
    () => ({ query, courtId, status: inTrash ? null : status, deletedOnly: inTrash }),
    [query, courtId, status, inTrash],
  );

  const { data: courts } = useCourts();
  const stats = useCaseStats(courtId);
  const list = useCaseList(params, page);
  const rows = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;

  const onSearch = (value: string) => {
    setSearch(value);
    if (page !== 1) setPage(1);
  };

  return (
    <>
      <AppHeader
        title={inTrash ? 'ถังขยะสำนวน' : 'รายการสำนวนทั้งหมด'}
        subtitle={list.isPending ? 'กำลังโหลด...' : `ทั้งหมด ${formatNumber(total)} รายการ`}
        actions={
          !inTrash && (
            <>
              <button type="button" className="btn-secondary" onClick={() => setImporting(true)}>
                <FileSpreadsheet className="size-5" />
                <span className="hidden sm:inline">นำเข้า Excel</span>
                <span className="sm:hidden">นำเข้า</span>
              </button>
              <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
                <Plus className="size-5" />
                <span className="hidden sm:inline">เพิ่มสำนวน</span>
                <span className="sm:hidden">เพิ่ม</span>
              </button>
            </>
          )
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SearchInput value={search} onChange={onSearch} placeholder="ค้นหาชื่อ / เลขคดีดำ / เลขคดีแดง / ศาล" onDark />
          <CourtSelector courts={courts} value={courtId} onChange={setCourt} />
        </div>
      </AppHeader>

      <PageContainer className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          {!inTrash && <StatusFilter value={status} onChange={setStatus} stats={stats.data} className="min-w-0 flex-1" />}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setTrash(!trash)}
              className={cn(trash ? 'chip-on' : 'chip-off', 'ml-auto')}
              aria-pressed={trash}
            >
              <Trash2 className="size-4" />
              {trash ? 'กลับไปรายการปกติ' : 'ถังขยะ'}
            </button>
          )}
        </div>

        <div className={cn('mt-4 transition-opacity', list.isPlaceholderData && 'opacity-60')}>
          {list.isPending ? (
            <ListSkeleton count={6} compact />
          ) : list.isError ? (
            <EmptyState
              icon={RefreshCw}
              title="โหลดข้อมูลไม่สำเร็จ"
              description={toThaiError(list.error)}
              action={
                <button type="button" className="btn-secondary" onClick={() => void list.refetch()}>
                  <RefreshCw className="size-4" /> ลองใหม่
                </button>
              }
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={inTrash ? Trash2 : FolderSearch}
              title={inTrash ? 'ถังขยะว่าง' : 'ไม่พบสำนวน'}
              description={inTrash ? 'ไม่มีสำนวนที่ถูกลบ' : 'ลองเปลี่ยนคำค้นหาหรือตัวกรอง หรือเพิ่มสำนวนใหม่'}
              action={
                !inTrash && (
                  <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
                    <Plus className="size-4" /> เพิ่มสำนวน
                  </button>
                )
              }
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {rows.map((row) => (
                <CaseListItem key={row.id} row={row} onOpen={setSelected} />
              ))}
            </div>
          )}
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} disabled={list.isFetching} />
      </PageContainer>

      <CaseDetailSheet row={selected} onClose={() => setSelected(null)} />
      <CaseFormSheet open={creating} onClose={() => setCreating(false)} defaultCourtId={courtId} />
      <ImportCasesSheet open={importing} onClose={() => setImporting(false)} defaultCourtId={courtId} />
    </>
  );
}
