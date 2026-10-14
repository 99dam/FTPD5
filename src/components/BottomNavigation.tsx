import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { visibleNavItems, type NavItem } from '@/layouts/navigation';
import { cn } from '@/lib/utils';

/** Moves the highlighted (main action) item to the centre of the bar. */
function centreHighlight(items: NavItem[]): NavItem[] {
  const main = items.find((i) => i.highlight);
  if (!main) return items;
  const rest = items.filter((i) => i !== main);
  const mid = Math.floor(rest.length / 2);
  return [...rest.slice(0, mid), main, ...rest.slice(mid)];
}

export function BottomNavigation() {
  const { isAdmin } = useAuth();
  const items = centreHighlight(visibleNavItems(isAdmin, true));

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-white/90 shadow-[0_-8px_24px_-12px_rgb(7_30_61/0.18)] backdrop-blur-xl lg:hidden"
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
                  'group flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors',
                  isActive ? 'text-brand-500' : 'text-muted',
                )
              }
            >
              {({ isActive }) =>
                item.highlight ? (
                  <>
                    <span
                      className={cn(
                        '-mt-7 grid size-14 place-items-center rounded-full bg-linear-to-br from-brand-400 to-brand-600 text-white ring-4 ring-white transition-transform duration-200 group-active:scale-90',
                        isActive ? 'shadow-[var(--shadow-brand)] animate-glow' : 'shadow-[var(--shadow-lift)]',
                      )}
                    >
                      <item.icon className="size-6" strokeWidth={2.4} aria-hidden />
                    </span>
                    <span className={cn(isActive ? 'text-brand-600' : 'text-navy-700')}>{item.short}</span>
                  </>
                ) : (
                  <>
                    <span
                      className={cn(
                        'relative grid h-8 w-14 place-items-center rounded-full transition-all duration-300 group-active:scale-90',
                        isActive ? '-translate-y-0.5 bg-brand-50' : 'group-hover:bg-slate-100',
                      )}
                    >
                      <item.icon
                        key={String(isActive)}
                        className={cn('size-[22px]', isActive && 'animate-pop')}
                        strokeWidth={isActive ? 2.4 : 2}
                        aria-hidden
                      />
                    </span>
                    {item.short}
                    <span
                      className={cn(
                        'h-1 rounded-full bg-brand-500 transition-all duration-300',
                        isActive ? 'w-4 opacity-100' : 'w-0 opacity-0',
                      )}
                      aria-hidden
                    />
                  </>
                )
              }
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
