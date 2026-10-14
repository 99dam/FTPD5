import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';

/** Navy gradient backdrop with a floating white card (login & password pages). */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="header-gradient safe-top relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div
        className="pointer-events-none absolute -top-32 -right-24 size-80 rounded-full bg-brand-500/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-navy-600/40 blur-3xl"
        aria-hidden
      />

      <div className="relative w-full max-w-[420px] animate-fade-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" showText={false} />
          <p className="mt-4 text-3xl font-extrabold tracking-wide text-white">
            FTPD<span className="text-brand-500">5</span>
          </p>
          <p className="text-white/70">ระบบติดตามสำนวนคดี</p>
        </div>

        <div className="rounded-[24px] bg-white p-6 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.5)] sm:p-8">
          <h1 className="text-2xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>

        <p className="mt-6 text-center text-xs text-white/45">สำหรับเจ้าหน้าที่ที่ได้รับอนุญาตเท่านั้น</p>
      </div>
    </div>
  );
}
