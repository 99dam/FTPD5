import { NavLink } from 'react-router-dom';
import { ChevronRight, LogOut, Sparkles } from 'lucide-react';
import { Logo } from './Logo';
import { RoleBadge } from './StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { visibleNavItems, type NavItem } from '@/layouts/navigation';
import { cn, formatToday, initials } from '@/lib/utils';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'อรุณสวัสดิ์';
  if (h < 17) return 'สวัสดีตอนบ่าย';
  return 'สวัสดีตอนเย็น';
}

function SidebarLink({ item, index }: { item: NavItem; index: number }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      style={{ animationDelay: `${index * 40}ms` }}
      className={({ isActive }) =>
        cn(
          'nav-item group relative flex min-h-12 items-center gap-3 rounded-2xl px-3 text-[15px] font-semibold animate-slide-in',
          isActive ? 'nav-item-active text-white' : 'text-white/70 hover:bg-white/6 hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute top-2.5 bottom-2.5 -left-4 w-1.5 rounded-r-full bg-brand-500 shadow-[0_0_12px_var(--color-brand-500)]" aria-hidden />
          )}
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-xl transition-all duration-200 group-hover:scale-110 group-hover:-rotate-6',
              isActive ? 'bg-linear-to-br from-brand-400 to-brand-600 text-white shadow-[var(--shadow-brand)]' : item.tint,
            )}
          >
            <item.icon className="size-[18px]" strokeWidth={2.3} aria-hidden />
          </span>
          <span className="flex-1 transition-transform duration-200 group-hover:translate-x-0.5">{item.label}</span>
          <ChevronRight
            className={cn(
              'size-4 transition-all duration-200',
              isActive ? 'text-brand-400 opacity-100' : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60',
            )}
            aria-hidden
          />
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { profile, isAdmin, signOut } = useAuth();
  const items = visibleNavItems(isAdmin, false);
  const mainItems = items.filter((i) => !i.adminOnly);
  const adminItems = items.filter((i) => i.adminOnly);

  return (
    <aside className="header-gradient fixed inset-y-0 left-0 z-30 hidden w-72 flex-col overflow-hidden text-white lg:flex">
      {/* Soft decorative glows */}
      <span className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-brand-500/20 blur-3xl animate-float" aria-hidden />
      <span className="pointer-events-none absolute bottom-24 -left-28 size-56 rounded-full bg-sky-400/10 blur-3xl animate-float [animation-delay:-3s]" aria-hidden />

      <div className="relative px-6 pt-7 pb-5">
        <Logo />
      </div>

      <div className="relative mx-4 mb-5 rounded-2xl bg-white/6 px-4 py-3 ring-1 ring-white/10">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <Sparkles className="size-4 text-brand-400 animate-twinkle" aria-hidden />
          {greeting()}
          {profile?.full_name ? `, ${profile.full_name.split(/\s+/)[0]}` : ''}
        </p>
        <p className="mt-0.5 text-xs text-white/55">{formatToday()}</p>
      </div>

      <nav className="relative flex-1 space-y-1 overflow-y-auto px-4" aria-label="เมนูหลัก">
        <p className="px-3 pb-1 text-[11px] font-bold tracking-wider text-white/40">เมนูหลัก</p>
        {mainItems.map((item, i) => (
          <SidebarLink key={item.to} item={item} index={i} />
        ))}
        {adminItems.length > 0 && (
          <>
            <p className="px-3 pt-5 pb-1 text-[11px] font-bold tracking-wider text-white/40">ผู้ดูแลระบบ</p>
            {adminItems.map((item, i) => (
              <SidebarLink key={item.to} item={item} index={mainItems.length + i} />
            ))}
          </>
        )}
      </nav>

      <div className="relative m-4 rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-linear-to-br from-brand-400 to-brand-600 text-sm font-bold">
            {initials(profile?.full_name)}
            <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-ok-500 ring-2 ring-navy-900" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{profile?.full_name || 'ผู้ใช้งาน'}</p>
            {profile && <RoleBadge role={profile.role} dark />}
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="btn-icon group size-10 text-white/70 hover:bg-danger-600/20 hover:text-white"
            aria-label="ออกจากระบบ"
            title="ออกจากระบบ"
          >
            <LogOut className="size-5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
