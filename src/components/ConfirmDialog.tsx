import type { ReactNode } from 'react';
import { LoaderCircle, TriangleAlert } from 'lucide-react';
import { Sheet } from './Sheet';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'ยืนยัน',
  tone = 'danger',
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      locked={loading}
      footer={
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onCancel} disabled={loading}>
            ยกเลิก
          </button>
          <button
            type="button"
            className={`${tone === 'danger' ? 'btn-danger' : 'btn-primary'} flex-1`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <LoaderCircle className="size-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="flex gap-3">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
            tone === 'danger' ? 'bg-danger-50 text-danger-600' : 'bg-brand-50 text-brand-500'
          }`}
        >
          <TriangleAlert className="size-5" aria-hidden />
        </span>
        <div className="pt-1 text-[15px] text-navy-800">{description}</div>
      </div>
    </Sheet>
  );
}
