import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Landmark, LoaderCircle, Pencil, Plus, Power, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader, PageContainer } from '@/components/AppHeader';
import { SearchInput } from '@/components/SearchInput';
import { Sheet } from '@/components/Sheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ListSkeleton } from '@/components/LoadingSkeleton';
import { ProgressBar } from '@/components/ProgressBar';
import { ActiveBadge } from '@/components/StatusBadge';
import { useCourtStats } from '@/hooks/queries';
import { createCourt, updateCourt } from '@/services/courts';
import { courtFormSchema, type CourtFormValues } from '@/lib/validation';
import { toThaiError } from '@/lib/errors';
import { cn, formatNumber, percent } from '@/lib/utils';
import type { CourtStats } from '@/types';

type Editing = { mode: 'create' } | { mode: 'edit'; court: CourtStats } | null;

export default function CourtsPage() {
  const qc = useQueryClient();
  const courts = useCourtStats();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const [toggling, setToggling] = useState<CourtStats | null>(null);

  const term = search.trim().toLowerCase();
  const list = (courts.data ?? []).filter((c) => !term || c.court_name.toLowerCase().includes(term));

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['courts'] });
    void qc.invalidateQueries({ queryKey: ['court-stats'] });
  };

  const toggleActive = useMutation({
    mutationFn: (c: CourtStats) => updateCourt(c.court_id, { is_active: !c.is_active }),
    onSuccess: (_d, c) => {
      toast.success(c.is_active ? 'ปิดใช้งานศาลแล้ว' : 'เปิดใช้งานศาลแล้ว');
      setToggling(null);
      invalidate();
    },
    onError: (err) => toast.error(toThaiError(err)),
  });

  return (
    <>
      <AppHeader
        title="จัดการศาล"
        subtitle={`ทั้งหมด ${formatNumber(courts.data?.length ?? 0)} ศาล`}
        actions={
          <button type="button" className="btn-primary" onClick={() => setEditing({ mode: 'create' })}>
            <Plus className="size-5" />
            เพิ่มศาล
          </button>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาชื่อศาล" onDark className="sm:max-w-md" />
      </AppHeader>

      <PageContainer className="mt-5">
        {courts.isPending ? (
          <ListSkeleton count={4} compact />
        ) : courts.isError ? (
          <EmptyState
            icon={RefreshCw}
            title="โหลดข้อมูลไม่สำเร็จ"
            description={toThaiError(courts.error)}
            action={
              <button type="button" className="btn-secondary" onClick={() => void courts.refetch()}>
                ลองใหม่
              </button>
            }
          />
        ) : list.length === 0 ? (
          <EmptyState icon={Landmark} title={term ? 'ไม่พบศาลที่ค้นหา' : 'ยังไม่มีศาล'} description="กดปุ่ม “เพิ่มศาล” เพื่อเริ่มต้น" />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {list.map((c) => (
              <li key={c.court_id} className={cn('card p-4 animate-fade-up', !c.is_active && 'opacity-70')}>
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'grid size-12 shrink-0 place-items-center rounded-2xl',
                      c.is_active ? 'bg-navy-900 text-brand-500' : 'bg-slate-100 text-slate-400',
                    )}
                  >
                    <Landmark className="size-6" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold break-words">{c.court_name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <ActiveBadge active={c.is_active} />
                      <span className="text-xs text-muted">{formatNumber(c.total)} สำนวน</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="btn-icon text-navy-700 hover:bg-slate-100"
                      onClick={() => setEditing({ mode: 'edit', court: c })}
                      aria-label={`แก้ไข ${c.court_name}`}
                    >
                      <Pencil className="size-[18px]" />
                    </button>
                    <button
                      type="button"
                      className={cn('btn-icon hover:bg-slate-100', c.is_active ? 'text-danger-600' : 'text-ok-600')}
                      onClick={() => setToggling(c)}
                      aria-label={c.is_active ? `ปิดใช้งาน ${c.court_name}` : `เปิดใช้งาน ${c.court_name}`}
                    >
                      <Power className="size-[18px]" />
                    </button>
                  </div>
                </div>
                {c.total > 0 && (
                  <>
                    <ProgressBar value={percent(c.complete, c.total)} className="mt-3" />
                    <p className="mt-1.5 text-xs text-muted">
                      ครบ {formatNumber(c.complete)} · ยังไม่ครบ {formatNumber(c.incomplete)} · ข้าม {formatNumber(c.skipped)}
                    </p>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </PageContainer>

      <CourtFormSheet editing={editing} onClose={() => setEditing(null)} onSaved={invalidate} />

      <ConfirmDialog
        open={Boolean(toggling)}
        tone={toggling?.is_active ? 'danger' : 'primary'}
        title={toggling?.is_active ? 'ปิดใช้งานศาล' : 'เปิดใช้งานศาล'}
        description={
          toggling?.is_active
            ? `ปิดใช้งาน “${toggling.court_name}”? สำนวนเดิมยังอยู่ครบ แต่จะเพิ่มสำนวนใหม่ในศาลนี้ไม่ได้`
            : `เปิดใช้งาน “${toggling?.court_name ?? ''}” อีกครั้ง?`
        }
        confirmLabel={toggling?.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
        loading={toggleActive.isPending}
        onConfirm={() => toggling && toggleActive.mutate(toggling)}
        onCancel={() => setToggling(null)}
      />
    </>
  );
}

function CourtFormSheet({ editing, onClose, onSaved }: { editing: Editing; onClose: () => void; onSaved: () => void }) {
  return (
    <Sheet open={Boolean(editing)} onClose={onClose} title={editing?.mode === 'edit' ? 'แก้ไขชื่อศาล' : 'เพิ่มศาลใหม่'}>
      {editing && (
        <CourtForm
          key={editing.mode === 'edit' ? editing.court.court_id : 'new'}
          editing={editing}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Sheet>
  );
}

function CourtForm({
  editing,
  onClose,
  onSaved,
}: {
  editing: NonNullable<Editing>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { register, handleSubmit, formState } = useForm<CourtFormValues>({
    resolver: zodResolver(courtFormSchema),
    defaultValues: { name: editing.mode === 'edit' ? editing.court.court_name : '' },
  });

  const mutation = useMutation({
    mutationFn: ({ name }: CourtFormValues) =>
      editing.mode === 'edit' ? updateCourt(editing.court.court_id, { name }) : createCourt(name),
    onSuccess: () => {
      toast.success(editing.mode === 'edit' ? 'บันทึกชื่อศาลแล้ว' : 'เพิ่มศาลแล้ว');
      onSaved();
      onClose();
    },
    onError: (err) => toast.error(toThaiError(err, { duplicate: 'มีชื่อศาลนี้อยู่แล้ว' })),
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) => {
        if (!mutation.isPending) mutation.mutate(v);
      })}
      className="space-y-4"
    >
      <div>
        <label htmlFor="court-name" className="field-label">
          ชื่อศาล <span className="text-danger-600">*</span>
        </label>
        <input id="court-name" className="field" maxLength={150} placeholder="เช่น ศาลแขวงพระนครเหนือ" {...register('name')} />
        {formState.errors.name && <p className="field-error">{formState.errors.name.message}</p>}
      </div>
      <button type="submit" className="btn-primary w-full" disabled={mutation.isPending}>
        {mutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
        บันทึก
      </button>
    </form>
  );
}
