import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Use the translucent style when placed on the navy header. */
  onDark?: boolean;
}

export function SearchInput({ value, onChange, placeholder = 'ค้นหา...', className, onDark }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className={cn(
          'pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2',
          onDark ? 'text-navy-700' : 'text-muted',
        )}
        aria-hidden
      />
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        maxLength={100}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn('field pr-11 pl-12 [&::-webkit-search-cancel-button]:hidden', onDark && 'border-transparent shadow-lg')}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-slate-100"
          aria-label="ล้างคำค้นหา"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
