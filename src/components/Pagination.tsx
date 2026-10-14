import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}

export function Pagination({ page, pageSize, total, onChange, disabled }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  return (
    <nav className="mt-5 flex items-center justify-between gap-3" aria-label="เปลี่ยนหน้า">
      <button
        type="button"
        className="btn-secondary"
        onClick={() => onChange(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="หน้าก่อนหน้า"
      >
        <ChevronLeft className="size-5" />
        <span className="hidden sm:inline">ก่อนหน้า</span>
      </button>
      <span className="text-sm font-semibold text-muted tabular-nums">
        หน้า {formatNumber(page)} / {formatNumber(totalPages)}
      </span>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => onChange(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="หน้าถัดไป"
      >
        <span className="hidden sm:inline">ถัดไป</span>
        <ChevronRight className="size-5" />
      </button>
    </nav>
  );
}
