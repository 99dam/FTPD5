import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet } from './Sheet';
import { CourtSelector } from './CourtSelector';
import { CaseNumberInput } from './CaseNumberInput';
import { useCourts } from '@/hooks/queries';
import { createCase } from '@/services/cases';
import { caseFormSchema, type CaseFormValues } from '@/lib/validation';
import { toThaiError } from '@/lib/errors';
import { formatSequence } from '@/lib/utils';

interface CaseFormSheetProps {
  open: boolean;
  onClose: () => void;
  defaultCourtId?: string | null;
}

export function CaseFormSheet({ open, onClose, defaultCourtId }: CaseFormSheetProps) {
  const qc = useQueryClient();
  const { data: courts } = useCourts();

  const form = useForm<CaseFormValues>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: {
      accused_name: '',
      court_id: defaultCourtId ?? '',
      black_case_number: '',
      red_case_number: '',
      note: '',
    },
  });
  const { register, handleSubmit, control, reset, formState } = form;
  const { errors } = formState;

  const mutation = useMutation({
    mutationFn: createCase,
    onSuccess: (created) => {
      toast.success(`เพิ่มสำนวนรายการ ${formatSequence(created.sequence_number)} แล้ว`);
      void qc.invalidateQueries({ queryKey: ['cases'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      void qc.invalidateQueries({ queryKey: ['court-stats'] });
      reset({ accused_name: '', court_id: form.getValues('court_id'), black_case_number: '', red_case_number: '', note: '' });
      onClose();
    },
    onError: (err) =>
      toast.error(toThaiError(err, { duplicate: 'เลขคดีนี้มีอยู่แล้วในศาลเดียวกัน' })),
  });

  const busy = mutation.isPending;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="เพิ่มสำนวนใหม่"
      description="ระบบจะสร้างเลขลำดับให้อัตโนมัติ"
      locked={busy}
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose} disabled={busy}>
            ยกเลิก
          </button>
          <button type="submit" form="case-create-form" className="btn-primary flex-[2]" disabled={busy}>
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
            เพิ่มสำนวน
          </button>
        </div>
      }
    >
      <form
        id="case-create-form"
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((values) => {
          if (busy) return; // double-submit guard
          mutation.mutate(values);
        })}
      >
        <div>
          <label htmlFor="cf-name" className="field-label">
            ชื่อผู้ถูกกล่าวหา <span className="text-danger-600">*</span>
          </label>
          <input id="cf-name" className="field" autoComplete="off" maxLength={200} {...register('accused_name')} />
          {errors.accused_name && <p className="field-error">{errors.accused_name.message}</p>}
        </div>

        <div>
          <label htmlFor="cf-court" className="field-label">
            ศาลที่พิพากษา <span className="text-danger-600">*</span>
          </label>
          <Controller
            control={control}
            name="court_id"
            render={({ field }) => (
              <CourtSelector
                id="cf-court"
                courts={courts}
                value={field.value || null}
                onChange={(v) => field.onChange(v ?? '')}
                allowAll={false}
              />
            )}
          />
          {errors.court_id && <p className="field-error">{errors.court_id.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CaseNumberInput kind="black" id="cf-black" error={errors.black_case_number?.message} {...register('black_case_number')} />
          <CaseNumberInput kind="red" id="cf-red" error={errors.red_case_number?.message} {...register('red_case_number')} />
        </div>

        <div>
          <label htmlFor="cf-note" className="field-label">
            หมายเหตุ
          </label>
          <textarea id="cf-note" rows={3} maxLength={2000} className="field py-3" {...register('note')} />
          {errors.note && <p className="field-error">{errors.note.message}</p>}
        </div>
      </form>
    </Sheet>
  );
}
