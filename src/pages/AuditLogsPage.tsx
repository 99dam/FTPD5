import { useState } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { AppHeader, PageContainer } from '@/components/AppHeader';
import { AuditLogItem } from '@/components/AuditLogItem';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton } from '@/components/LoadingSkeleton';
import { Pagination } from '@/components/Pagination';
import { useAuditLogs } from '@/hooks/queries';
import { toThaiError } from '@/lib/errors';
import { cn, formatNumber } from '@/lib/utils';
import type { AuditLog } from '@/types';

const PAGE_SIZE = 30;
const FILTERS: Array<{ value: AuditLog['entity_type'] | null; label: string }> = [
  { value: null, label: 'ทั้งหมด' },
  { value: 'case', label: 'สำนวน' },
  { value: 'court', label: 'ศาล' },
  { value: 'user', label: 'ผู้ใช้' },
];

export default function AuditLogsPage() {
  const [entity, setEntity] = useState<AuditLog['entity_type'] | null>(null);
  const [page, setPage] = useState(1);
  const logs = useAuditLogs(entity, null, page, PAGE_SIZE);

  return (
    <>
      <AppHeader
        title="ประวัติการแก้ไข"
        subtitle={logs.data ? `ทั้งหมด ${formatNumber(logs.data.total)} รายการ` : 'บันทึกโดยฐานข้อมูล แก้ไขหรือลบไม่ได้'}
      />
      <PageContainer className="mt-5">
        <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="กรองประเภท">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              role="radio"
              aria-checked={entity === f.value}
              className={entity === f.value ? 'chip-on' : 'chip-off'}
              onClick={() => {
                setEntity(f.value);
                setPage(1);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className={cn('mt-4 transition-opacity', logs.isPlaceholderData && 'opacity-60')}>
          {logs.isPending ? (
            <ListSkeleton count={6} compact />
          ) : logs.isError ? (
            <EmptyState
              icon={RefreshCw}
              title="โหลดข้อมูลไม่สำเร็จ"
              description={toThaiError(logs.error)}
              action={
                <button type="button" className="btn-secondary" onClick={() => void logs.refetch()}>
                  ลองใหม่
                </button>
              }
            />
          ) : logs.data.rows.length === 0 ? (
            <EmptyState icon={History} title="ยังไม่มีประวัติ" />
          ) : (
            <ul className="space-y-3">
              {logs.data.rows.map((log) => (
                <AuditLogItem key={log.id} log={log} />
              ))}
            </ul>
          )}
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} total={logs.data?.total ?? 0} onChange={setPage} disabled={logs.isFetching} />
      </PageContainer>
    </>
  );
}
