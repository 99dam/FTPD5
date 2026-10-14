import type { LucideIcon } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

export type StatTone = 'navy' | 'green' | 'orange' | 'gray';

const TONES: Record<StatTone, { bubble: string; ring: string }> = {
  navy: { bubble: 'bg-navy-900 text-white', ring: 'ring-navy-900' },
  green: { bubble: 'bg-ok-50 text-ok-600', ring: 'ring-ok-500' },
  orange: { bubble: 'bg-brand-50 text-brand-500', ring: 'ring-brand-500' },
  gray: { bubble: 'bg-slate-100 text-slate-500', ring: 'ring-slate-400' },
};

interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: LucideIcon;
  tone: StatTone;
  hint?: string;
  active?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

export function StatCard({ label, value, icon: Icon, tone, hint, active, loading, onClick }: StatCardProps) {
  const t = TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'card flex w-full flex-col items-start gap-3 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] sm:p-5',
        active && cn('ring-2', t.ring),
      )}
    >
      <span className={cn('grid size-11 place-items-center rounded-2xl', t.bubble)}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="block w-full">
        <span className="block text-sm font-semibold text-muted">{label}</span>
        {loading ? (
          <span className="skeleton mt-1.5 block h-8 w-16" />
        ) : (
          <span className="mt-0.5 block text-[28px] leading-tight font-extrabold tabular-nums">
            {formatNumber(value)}
          </span>
        )}
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
    </button>
  );
}
