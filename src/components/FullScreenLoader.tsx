import { LoaderCircle } from 'lucide-react';
import { Logo } from './Logo';

export function FullScreenLoader() {
  return (
    <div className="header-gradient grid min-h-dvh place-items-center" role="status" aria-label="กำลังโหลด">
      <div className="flex flex-col items-center gap-6">
        <Logo size="lg" />
        <LoaderCircle className="size-7 animate-spin text-brand-500" aria-hidden />
      </div>
    </div>
  );
}
