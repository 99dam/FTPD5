import { ChevronRight, Landmark } from 'lucide-react';
import type { CaseRow } from '@/types';
import { formatSequence } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';

export function CaseListItem({ row, onOpen }: { row: CaseRow; onOpen: (row: CaseRow) => void }) {
  const seq = formatSequence(row.sequence_number);
  return (
    <button
      type="button"
      onClick={() => onOpen(row)}
      className="card flex w-full items-center gap-3 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] animate-fade-up"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-navy-900/6 text-sm font-extrabold text-navy-800 tabular-nums">
        {seq}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="font-bold break-words">{row.accused_name}</span>
          <StatusBadge row={row} />
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
          <Landmark className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{row.court_name}</span>
        </span>
        <span className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>
            <span className="text-muted">ดำ </span>
            <span className="font-semibold">{row.black_case_number ?? '—'}</span>
          </span>
          <span>
            <span className="text-muted">แดง </span>
            <span className="font-semibold text-danger-600">{row.red_case_number ?? '—'}</span>
          </span>
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-slate-300" aria-hidden />
    </button>
  );
}
