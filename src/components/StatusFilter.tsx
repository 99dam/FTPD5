import type { CaseStats, CaseStatus } from '@/types';
import { cn, formatNumber } from '@/lib/utils';

const OPTIONS: Array<{ value: CaseStatus | null; label: string; statKey: keyof CaseStats }> = [
  { value: 'incomplete', label: 'ยังไม่ครบ', statKey: 'incomplete' },
  { value: 'skipped', label: 'ข้าม', statKey: 'skipped' },
  { value: 'complete', label: 'ครบแล้ว', statKey: 'complete' },
  { value: null, label: 'ทั้งหมด', statKey: 'total' },
];

interface StatusFilterProps {
  value: CaseStatus | null;
  onChange: (value: CaseStatus | null) => void;
  stats?: CaseStats;
  className?: string;
}

export function StatusFilter({ value, onChange, stats, className }: StatusFilterProps) {
  return (
    <div
      className={cn('-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0', className)}
      role="radiogroup"
      aria-label="กรองตามสถานะ"
    >
      {OPTIONS.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={active ? 'chip-on' : 'chip-off'}
          >
            {o.label}
            {stats && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  active ? 'bg-white/20' : 'bg-slate-100 text-muted',
                )}
              >
                {formatNumber(stats[o.statKey])}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
