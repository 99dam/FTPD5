import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChartBar, CircleCheck, CircleDashed, ClipboardPen, FolderOpen, Landmark, SkipForward } from 'lucide-react';
import { AppHeader, PageContainer } from '@/components/AppHeader';
import { StatCard } from '@/components/StatCard';
import { CourtSelector } from '@/components/CourtSelector';
import { ProgressBar } from '@/components/ProgressBar';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton } from '@/components/LoadingSkeleton';
import { useAuth } from '@/hooks/useAuth';
import { useCaseFilters } from '@/hooks/useCaseFilters';
import { useCaseStats, useCourtStats, useCourts } from '@/hooks/queries';
import { formatNumber, formatToday, percent } from '@/lib/utils';
import type { CaseStatus } from '@/types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { courtId, setCourt } = useCaseFilters(null);
  const { data: courts } = useCourts();
  const stats = useCaseStats(courtId);
  const courtStats = useCourtStats();

  const goToCases = (status: CaseStatus | 'all') => {
    const qs = new URLSearchParams({ status, court: courtId ?? '' });
    navigate(`/cases?${qs.toString()}`);
  };

  const s = stats.data;
  const visibleCourts = (courtStats.data ?? []).filter((c) => c.is_active || c.total > 0);
  const overall = percent(s?.complete ?? 0, s?.total ?? 0);

  return (
    <>
      <AppHeader
        title={`สวัสดี, ${profile?.full_name?.split(' ')[0] || 'เจ้าหน้าที่'}`}
        subtitle={formatToday()}
        actions={
          <button type="button" className="btn-primary hidden sm:inline-flex" onClick={() => navigate('/record')}>
            <ClipboardPen className="size-4" />
            เริ่มบันทึกเลขคดี
          </button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,360px)_1fr] sm:items-center">
          <CourtSelector courts={courts} value={courtId} onChange={setCourt} />
          <div className="rounded-2xl bg-white/8 px-4 py-3 ring-1 ring-white/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/75">ความคืบหน้าการบันทึก</span>
              <span className="font-bold text-brand-400 tabular-nums">{overall}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500" style={{ width: `${overall}%` }} />
            </div>
          </div>
        </div>
      </AppHeader>

      <PageContainer className="mt-5 space-y-6">
        <section aria-label="สถิติสำนวน" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard label="สำนวนทั้งหมด" value={s?.total} icon={FolderOpen} tone="navy" loading={stats.isPending} onClick={() => goToCases('all')} />
          <StatCard label="กรอกครบแล้ว" value={s?.complete} icon={CircleCheck} tone="green" loading={stats.isPending} onClick={() => goToCases('complete')} />
          <StatCard label="ยังไม่ครบ" value={s?.incomplete} icon={CircleDashed} tone="orange" loading={stats.isPending} onClick={() => goToCases('incomplete')} />
          <StatCard label="ข้ามรายการ" value={s?.skipped} icon={SkipForward} tone="gray" loading={stats.isPending} onClick={() => goToCases('skipped')} />
        </section>

        <button type="button" className="btn-primary min-h-13 w-full sm:hidden" onClick={() => navigate('/record')}>
          <ClipboardPen className="size-5" />
          เริ่มบันทึกเลขคดี
        </button>

        <section aria-labelledby="court-stats-title">
          <div className="mb-3 flex items-center gap-2">
            <ChartBar className="size-5 text-brand-500" aria-hidden />
            <h2 id="court-stats-title" className="text-lg font-extrabold">
              สถิติแยกตามศาล
            </h2>
          </div>

          {courtStats.isPending ? (
            <ListSkeleton count={3} compact />
          ) : visibleCourts.length === 0 ? (
            <EmptyState icon={Landmark} title="ยังไม่มีข้อมูลศาล" description="ผู้ดูแลระบบสามารถเพิ่มศาลได้ที่เมนูจัดการศาล" />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {visibleCourts.map((c) => {
                const p = percent(c.complete, c.total);
                return (
                  <li key={c.court_id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/record?court=${c.court_id}`)}
                      className="card group w-full p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-navy-900 text-white">
                          <Landmark className="size-5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{c.court_name}</p>
                          <p className="text-xs text-muted">
                            ครบ {formatNumber(c.complete)} จาก {formatNumber(c.total)} สำนวน
                          </p>
                        </div>
                        <span className="text-lg font-extrabold text-brand-500 tabular-nums">{p}%</span>
                        <ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </div>
                      <ProgressBar value={p} className="mt-3" />
                      <div className="mt-2.5 flex gap-4 text-xs font-semibold">
                        <span className="text-ok-600">ครบ {formatNumber(c.complete)}</span>
                        <span className="text-brand-600">ยังไม่ครบ {formatNumber(c.incomplete)}</span>
                        <span className="text-slate-500">ข้าม {formatNumber(c.skipped)}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </PageContainer>
    </>
  );
}
