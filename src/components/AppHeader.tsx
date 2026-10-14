import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { useAuth } from '@/hooks/useAuth';
import { initials } from '@/lib/utils';

interface AppHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Extra content inside the navy band (search bar, filters...). */
  children?: ReactNode;
}

export function AppHeader({ title, subtitle, actions, children }: AppHeaderProps) {
  const { profile } = useAuth();

  return (
    <header className="header-gradient safe-top rounded-b-[28px] text-white lg:mx-8 lg:mt-6 lg:rounded-[28px]">
      <div className="mx-auto max-w-6xl px-4 pt-4 pb-6 sm:px-6 lg:px-8 lg:pt-7 lg:pb-7">
        <div className="mb-5 flex items-center justify-between lg:hidden">
          <Logo size="sm" />
          <Link
            to="/account"
            className="grid size-10 place-items-center rounded-full bg-brand-500 text-sm font-bold ring-2 ring-white/20"
            aria-label="บัญชีผู้ใช้"
          >
            {initials(profile?.full_name)}
          </Link>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight font-extrabold sm:text-[28px]">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>

        {children && <div className="mt-5">{children}</div>}
      </div>
    </header>
  );
}

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-6xl px-4 sm:px-6 lg:px-16 ${className ?? ''}`}>{children}</div>;
}
