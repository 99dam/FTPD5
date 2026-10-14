import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, LoaderCircle, Lock, RotateCcw, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet } from './Sheet';
import { ConfirmDialog } from './ConfirmDialog';
import { CourtSelector } from './CourtSelector';
import { CaseNumberInput } from './CaseNumberInput';
import { StatusBadge } from './StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useCourts } from '@/hooks/queries';
import { restoreCase, softDeleteCase, updateCase, type CaseInput } from '@/services/cases';
import { caseFormSchema, type CaseFormValues } from '@/lib/validation';
import { toThaiError } from '@/lib/errors';
import { formatDateTime, formatSequence } from '@/lib/utils';
import type { CaseRow } from '@/types';

interface CaseDetailSheetProps {
  row: CaseRow | null;
  onClose: () => void;
}

export function CaseDetailSheet({ row, onClose }: CaseDetailSheetProps) {
  return (
    <Sheet
      open={Boolean(row)}
      onClose={onClose}
      title={row ? `รายการ ${formatSequence(row.sequence_number)}` : ''}
      description="รายละเอียดสำนวน"
      size="lg"
    >
      {/* Keyed so the form resets whenever another case is opened. */}
      {row && <CaseDetailBody key={`${row.id}:${row.updated_at}`} row={row} onClose={onClose} />}
    </Sheet>
  );
}

function CaseDetailBody({ row, onClose }: { row: CaseRow; onClose: () => void }) {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const { data: courts } = useCourts();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleted = Boolean(row.deleted_at);
  const readOnly = deleted;
  // Both numbers recorded: only admins may correct them (enforced in the database too).
  const numbersLocked = row.is_complete && !isAdmin;

  const { register, handleSubmit, control, formState } = useForm<CaseFormValues>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: {
      accused_name: row.accused_name,
      court_id: row.court_id,
      black_case_number: row.black_case_number ?? '',
      red_case_number: row.red_case_number ?? '',
      note: row.note ?? '',
    },
  });
  const { errors, isDirty } = formState;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['cases'] });
    void qc.invalidateQueries({ queryKey: ['stats'] });
    void qc.invalidateQueries({ queryKey: ['court-stats'] });
  };

  const save = useMutation({
    mutationFn: (values: CaseFormValues) => {
      const changes: Partial<CaseInput> = {};
      const same = (a: string | null, b: string) => (a ?? '').trim() === b.trim();
      if (isAdmin && !same(row.accused_name, values.accused_name)) changes.accused_name = values.accused_name;
      if (isAdmin && row.court_id !== values.court_id) changes.court_id = values.court_id;
      if (!same(row.black_case_number, values.black_case_number)) changes.black_case_number = values.black_case_number;
      if (!same(row.red_case_number, values.red_case_number)) changes.red_case_number = values.red_case_number;
      if (!same(row.note, values.note)) changes.note = values.note;
      return updateCase(row.id, changes);
    },
    onSuccess: () => {
      toast.success('บันทึกการแก้ไขแล้ว');
      invalidate();
      onClose();
    },
    onError: (err) => toast.error(toThaiError(err, { duplicate: 'เลขคดีนี้มีอยู่แล้วในศาลเดียวกัน' })),
  });

  const remove = useMutation({
    mutationFn: () => softDeleteCase(row.id),
    onSuccess: () => {
      toast.success('ลบสำนวนแล้ว (กู้คืนได้จากถังขยะ)');
      setConfirmDelete(false);
      invalidate();
      onClose();
    },
    onError: (err) => toast.error(toThaiError(err)),
  });

  const restore = useMutation({
    mutationFn: () => restoreCase(row.id),
    onSuccess: () => {
      toast.success('กู้คืนสำนวนแล้ว');
      invalidate();
      onClose();
    },
    onError: (err) => toast.error(toThaiError(err, { duplicate: 'กู้คืนไม่ได้: มีสำนวนที่ใช้เลขคดีเดียวกันในศาลนี้แล้ว' })),
  });

  const busy = save.isPending || remove.isPending || restore.isPending;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge row={row} />
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <CalendarClock className="size-3.5" aria-hidden />
          แก้ไขล่าสุด {formatDateTime(row.updated_at)}
        </span>
      </div>

      <form
        id="case-detail-form"
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((v) => {
          if (!busy) save.mutate(v);
        })}
      >
        <div>
          <label htmlFor="cd-name" className="field-label flex items-center gap-1.5">
            ชื่อผู้ถูกกล่าวหา {!isAdmin && <Lock className="size-3.5 text-muted" aria-label="แก้ไขได้เฉพาะผู้ดูแล" />}
          </label>
          <input
            id="cd-name"
            className="field"
            maxLength={200}
            disabled={readOnly || !isAdmin || busy}
            {...register('accused_name')}
          />
          {errors.accused_name && <p className="field-error">{errors.accused_name.message}</p>}
        </div>

        <div>
          <label htmlFor="cd-court" className="field-label flex items-center gap-1.5">
            ศาลที่พิพากษา {!isAdmin && <Lock className="size-3.5 text-muted" aria-label="แก้ไขได้เฉพาะผู้ดูแล" />}
          </label>
          <Controller
            control={control}
            name="court_id"
            render={({ field }) => (
              <CourtSelector
                id="cd-court"
                courts={courts}
                value={field.value || null}
                onChange={(v) => field.onChange(v ?? '')}
                allowAll={false}
                disabled={readOnly || !isAdmin || busy}
              />
            )}
          />
          {errors.court_id && <p className="field-error">{errors.court_id.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CaseNumberInput
            kind="black"
            id="cd-black"
            disabled={readOnly || numbersLocked || busy}
            error={errors.black_case_number?.message}
            {...register('black_case_number')}
          />
          <CaseNumberInput
            kind="red"
            id="cd-red"
            disabled={readOnly || numbersLocked || busy}
            error={errors.red_case_number?.message}
            {...register('red_case_number')}
          />
        </div>
        {numbersLocked && !readOnly && (
          <p className="-mt-2 flex items-center gap-1.5 text-sm font-semibold text-ok-600">
            <Lock className="size-4 shrink-0" aria-hidden />
            กรอกครบแล้ว เลขคดีถูกล็อก แก้ได้เฉพาะผู้ดูแลระบบ
          </p>
        )}

        <div>
          <label htmlFor="cd-note" className="field-label">
            หมายเหตุ
          </label>
          <textarea
            id="cd-note"
            rows={3}
            maxLength={2000}
            className="field py-3"
            disabled={readOnly || busy}
            {...register('note')}
          />
          {errors.note && <p className="field-error">{errors.note.message}</p>}
        </div>

        <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-surface p-4 text-sm">
          <div>
            <dt className="text-muted">สร้างเมื่อ</dt>
            <dd className="font-semibold">{formatDateTime(row.created_at)}</dd>
          </div>
          <div>
            <dt className="text-muted">แก้ไขล่าสุด</dt>
            <dd className="font-semibold">{formatDateTime(row.updated_at)}</dd>
          </div>
          {deleted && (
            <div className="col-span-2">
              <dt className="text-muted">ลบเมื่อ</dt>
              <dd className="font-semibold text-danger-600">{formatDateTime(row.deleted_at)}</dd>
            </div>
          )}
        </dl>
      </form>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
        {isAdmin && !deleted && (
          <button type="button" className="btn-secondary text-danger-600" onClick={() => setConfirmDelete(true)} disabled={busy}>
            <Trash2 className="size-4" />
            ลบสำนวน
          </button>
        )}
        {isAdmin && deleted && (
          <button type="button" className="btn-navy flex-1" onClick={() => restore.mutate()} disabled={busy}>
            {restore.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            กู้คืนสำนวน
          </button>
        )}
        {!deleted && (
          <button type="submit" form="case-detail-form" className="btn-primary flex-1" disabled={busy || !isDirty}>
            {save.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            บันทึกการแก้ไข
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="ยืนยันการลบสำนวน"
        description={
          <>
            ต้องการลบสำนวนของ <strong>{row.accused_name}</strong> ใช่หรือไม่?
            <br />
            <span className="text-sm text-muted">รายการจะถูกย้ายไปถังขยะและผู้ดูแลระบบกู้คืนได้</span>
          </>
        }
        confirmLabel="ลบสำนวน"
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
