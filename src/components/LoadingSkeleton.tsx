import { cn } from '@/lib/utils';

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('card p-4', className)} aria-hidden>
      <div className="flex items-start gap-3">
        <div className="skeleton size-11 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-5 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="skeleton h-12 rounded-[14px]" />
        <div className="skeleton h-12 rounded-[14px]" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 5, compact = false }: { count?: number; compact?: boolean }) {
  return (
    <div className="space-y-3" role="status" aria-label="กำลังโหลด">
      {Array.from({ length: count }, (_, i) =>
        compact ? (
          <div key={i} className="card flex items-center gap-3 p-4" aria-hidden>
            <div className="skeleton size-11 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          </div>
        ) : (
          <CardSkeleton key={i} />
        ),
      )}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="กำลังโหลด">
      <div className="header-gradient h-44 rounded-b-[28px] lg:mx-8 lg:mt-6 lg:rounded-[28px]" />
      <div className="mx-auto mt-5 max-w-6xl space-y-3 px-4 lg:px-16">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
