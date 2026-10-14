import { ChevronDown, Landmark } from 'lucide-react';
import type { Court } from '@/types';
import { cn } from '@/lib/utils';

interface CourtSelectorProps {
  courts: Court[] | undefined;
  value: string | null;
  onChange: (courtId: string | null) => void;
  /** Show "ทุกศาล" as the first option (filters). Forms pass false. */
  allowAll?: boolean;
  includeInactive?: boolean;
  id?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function CourtSelector({
  courts,
  value,
  onChange,
  allowAll = true,
  includeInactive = false,
  id,
  className,
  disabled,
  placeholder = 'เลือกศาลที่พิพากษา',
}: CourtSelectorProps) {
  const options = (courts ?? []).filter((c) => includeInactive || c.is_active || c.id === value);

  return (
    <div className={cn('relative', className)}>
      <Landmark className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
      <select
        id={id}
        value={value ?? ''}
        disabled={disabled || !courts}
        onChange={(e) => onChange(e.target.value || null)}
        aria-label="ศาลที่พิพากษา"
        className="field appearance-none truncate pr-10 pl-12"
      >
        {allowAll ? <option value="">ทุกศาล</option> : <option value="">{placeholder}</option>}
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {!c.is_active ? ' (ปิดใช้งาน)' : ''}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
}
