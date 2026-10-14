import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Logo } from './Logo';
import { RoleBadge } from './StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { visibleNavItems } from '@/layouts/navigation';
import { cn, initials } from '@/lib/utils';

export function Sidebar() {
  const { profile, isAdmin, signOut } = useAuth();
  const items = visibleNavItems(isAdmin, false);

  return (
    <aside className="header-gradient fixed inset-y-0 left-0 z-30 hidden w-72 flex-col text-white lg:flex">
      <div className="px-6 pt-7 pb-8">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4" aria-label="เมนูหลัก">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'group relative flex min-h-12 items-center gap-3 rounded-2xl px-4 text-[15px] font-semibold transition-colors',
                isActive ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/6 hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-2.5 bottom-2.5 left-0 w-1 rounded-r-full bg-brand-500" aria-hidden />
                )}
                <item.icon className={cn('size-5', isActive ? 'text-brand-500' : 'text-white/60')} aria-hidden />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="m-4 rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-500 text-sm font-bold">
            {initials(profile?.full_name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{profile?.full_name || 'ผู้ใช้งาน'}</p>
            {profile && <RoleBadge role={profile.role} dark />}
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="btn-icon size-10 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="ออกจากระบบ"
            title="ออกจากระบบ"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
