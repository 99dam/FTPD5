import {
  CircleUserRound,
  ClipboardPen,
  FolderOpen,
  History,
  Landmark,
  LayoutDashboard,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: LucideIcon;
  /** Accent for the icon tile in the sidebar (full class strings so Tailwind picks them up). */
  tint: string;
  adminOnly?: boolean;
  /** Hidden from the mobile bottom bar (reachable from the Account page). */
  desktopOnly?: boolean;
  /** Main action: rendered as a raised button in the mobile bottom bar. */
  highlight?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'หน้าหลัก', short: 'หน้าหลัก', icon: LayoutDashboard, tint: 'bg-sky-400/15 text-sky-300' },
  {
    to: '/record',
    label: 'บันทึกเลขคดี',
    short: 'บันทึก',
    icon: ClipboardPen,
    tint: 'bg-amber-400/15 text-amber-300',
    highlight: true,
  },
  { to: '/cases', label: 'รายการสำนวน', short: 'สำนวน', icon: FolderOpen, tint: 'bg-emerald-400/15 text-emerald-300' },
  { to: '/account', label: 'บัญชีผู้ใช้', short: 'บัญชี', icon: CircleUserRound, tint: 'bg-violet-400/15 text-violet-300' },
  { to: '/courts', label: 'จัดการศาล', short: 'ศาล', icon: Landmark, tint: 'bg-rose-400/15 text-rose-300', adminOnly: true },
  {
    to: '/users',
    label: 'จัดการผู้ใช้งาน',
    short: 'ผู้ใช้',
    icon: Users,
    tint: 'bg-cyan-400/15 text-cyan-300',
    adminOnly: true,
    desktopOnly: true,
  },
  {
    to: '/audit',
    label: 'ประวัติการแก้ไข',
    short: 'ประวัติ',
    icon: History,
    tint: 'bg-slate-300/15 text-slate-300',
    adminOnly: true,
    desktopOnly: true,
  },
];

export function visibleNavItems(isAdmin: boolean, mobile: boolean): NavItem[] {
  return NAV_ITEMS.filter((i) => (isAdmin || !i.adminOnly) && (!mobile || !i.desktopOnly));
}
