import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Prevent closing via overlay / Escape (e.g. while saving). */
  locked?: boolean;
  size?: 'md' | 'lg';
}

/** Bottom sheet on mobile, centred dialog on larger screens. */
export function Sheet({ open, onClose, title, description, children, footer, locked, size = 'md' }: SheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const lockedRef = useRef(locked);

  useEffect(() => {
    closeRef.current = onClose;
    lockedRef.current = locked;
  }, [onClose, locked]);

  // Runs only when the sheet opens/closes so re-renders never steal focus.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !lockedRef.current) closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-navy-950/55 backdrop-blur-[2px] animate-fade-up"
        onClick={() => !locked && onClose()}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'safe-bottom relative flex max-h-[92dvh] w-full flex-col rounded-t-[28px] bg-white shadow-[var(--shadow-lift)] outline-none animate-sheet-up sm:rounded-[24px]',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" aria-hidden />
        <div className="flex items-start gap-3 px-5 pt-4 pb-3 sm:px-6 sm:pt-6">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-xl font-extrabold">
              {title}
            </h2>
            {description && <div className="mt-0.5 text-sm text-muted">{description}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            className="btn-icon -mt-1 -mr-2 text-muted hover:bg-slate-100"
            aria-label="ปิด"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
        {footer && <div className="border-t border-line px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
