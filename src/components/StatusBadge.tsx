import { CircleCheck, CircleDashed, ShieldCheck, SkipForward, Trash2, UserRound } from 'lucide-react';
import type { CaseRow, Role } from '@/types';
import { caseKind, type CaseKind } from '@/lib/caseStatus';
import { cn } from '@/lib/utils';

const STYLES: Record<CaseKind, { label: string; cls: string; Icon: typeof CircleCheck }> = {
  complete: { label: 'ครบแล้ว', cls: 'bg-ok-50 text-ok-600 ring-ok-500/20', Icon: CircleCheck },
  incomplete: { label: 'ยังไม่ครบ', cls: 'bg-brand-50 text-brand-600 ring-brand-500/20', Icon: CircleDashed },
  skipped: { label: 'ข้าม', cls: 'bg-slate-100 text-slate-600 ring-slate-400/25', Icon: SkipForward },
  deleted: { label: 'ถูกลบ', cls: 'bg-danger-50 text-danger-600 ring-danger-600/20', Icon: Trash2 },
};

export function StatusBadge({
  row,
  className,
}: {
  row: Pick<CaseRow, 'is_complete' | 'is_skipped' | 'deleted_at'>;
  className?: string;
}) {
  const s = STYLES[caseKind(row)];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 transition-colors',
        s.cls,
        className,
      )}
    >
      <s.Icon className="size-3.5" aria-hidden />
      {s.label}
    </span>
  );
}

export function RoleBadge({ role, dark = false }: { role: Role; dark?: boolean }) {
  const admin = role === 'admin';
  const Icon = admin ? ShieldCheck : UserRound;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold',
        admin
          ? dark
            ? 'bg-brand-500/20 text-brand-400'
            : 'bg-brand-50 text-brand-600'
          : dark
            ? 'bg-white/10 text-white/80'
            : 'bg-navy-900/6 text-navy-700',
      )}
    >
      <Icon className="size-3" aria-hidden />
      {admin ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'}
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
        active ? 'bg-ok-50 text-ok-600' : 'bg-slate-100 text-slate-500',
      )}
    >
      <span className={cn('size-1.5 rounded-full', active ? 'bg-ok-500' : 'bg-slate-400')} aria-hidden />
      {active ? 'ใช้งาน' : 'ปิดใช้งาน'}
    </span>
  );
}
