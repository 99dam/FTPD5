import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { visibleNavItems } from '@/layouts/navigation';
import { cn } from '@/lib/utils';

export function BottomNavigation() {
  const { isAdmin } = useAuth();
  const items = visibleNavItems(isAdmin, true);

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 shadow-[0_-8px_24px_-12px_rgb(7_30_61/0.18)] backdrop-blur lg:hidden"
      aria-label="เมนูหลัก"
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-around px-1">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors',
                  isActive ? 'text-brand-500' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'grid h-8 w-12 place-items-center rounded-full transition-colors',
                      isActive && 'bg-brand-50',
                    )}
                  >
                    <item.icon className="size-[22px]" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                  </span>
                  {item.short}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
