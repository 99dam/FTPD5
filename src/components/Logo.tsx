import { Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const SIZES = {
  sm: { box: 'size-9 rounded-xl', icon: 'size-5', title: 'text-lg', sub: 'text-[10px]' },
  md: { box: 'size-11 rounded-2xl', icon: 'size-6', title: 'text-xl', sub: 'text-[11px]' },
  lg: { box: 'size-16 rounded-[22px]', icon: 'size-9', title: 'text-3xl', sub: 'text-sm' },
};

/** FTPD5 mark: orange scales of justice on a frosted navy tile. */
export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const s = SIZES[size];
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className={cn(
          'grid shrink-0 place-items-center bg-white/10 ring-1 ring-white/15 backdrop-blur',
          s.box,
        )}
      >
        <Scale className={cn('text-brand-500', s.icon)} strokeWidth={2.4} aria-hidden />
      </span>
      {showText && (
        <span className="leading-tight text-white">
          <span className={cn('block font-extrabold tracking-wide', s.title)}>
            FTPD<span className="text-brand-500">5</span>
          </span>
          <span className={cn('block text-white/65', s.sub)}>ระบบติดตามสำนวนคดี</span>
        </span>
      )}
    </div>
  );
}
