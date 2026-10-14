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
  adminOnly?: boolean;
  /** Hidden from the mobile bottom bar (reachable from the Account page). */
  desktopOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'หน้าหลัก', short: 'หน้าหลัก', icon: LayoutDashboard },
  { to: '/record', label: 'บันทึกเลขคดี', short: 'บันทึก', icon: ClipboardPen },
  { to: '/cases', label: 'รายการสำนวน', short: 'สำนวน', icon: FolderOpen },
  { to: '/courts', label: 'จัดการศาล', short: 'ศาล', icon: Landmark, adminOnly: true },
  { to: '/users', label: 'จัดการผู้ใช้งาน', short: 'ผู้ใช้', icon: Users, adminOnly: true, desktopOnly: true },
  { to: '/audit', label: 'ประวัติการแก้ไข', short: 'ประวัติ', icon: History, adminOnly: true, desktopOnly: true },
  { to: '/account', label: 'บัญชีผู้ใช้', short: 'บัญชี', icon: CircleUserRound },
];

export function visibleNavItems(isAdmin: boolean, mobile: boolean): NavItem[] {
  return NAV_ITEMS.filter((i) => (isAdmin || !i.adminOnly) && (!mobile || !i.desktopOnly));
}
