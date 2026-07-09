import type { MenuConfigItem } from "~/types"

export const ADMIN_MENU_ITEMS: MenuConfigItem[] = [
  { id: 'events', label: '活動管理', icon: 'edit_calendar', bgClass: 'bg-sky-50', textClass: 'text-sky-600', hoverClass: 'hover:bg-sky-100', to: '/admin/events' },
  { id: 'registrations', label: '報名狀況', icon: 'assignment_ind', bgClass: 'bg-indigo-50', textClass: 'text-indigo-600', hoverClass: 'hover:bg-indigo-100', to: '/admin/registrations' },
  { id: 'attendance', label: '活動出席', icon: 'verified', bgClass: 'bg-teal-50', textClass: 'text-teal-600', hoverClass: 'hover:bg-teal-100', to: '/admin/attendance' },
  { id: 'members', label: '會員管理', icon: 'group', bgClass: 'bg-violet-50', textClass: 'text-violet-600', hoverClass: 'hover:bg-violet-100', to: '/admin/members' },
  { id: 'points-history-admin', label: '點數紀錄', icon: 'history', bgClass: 'bg-amber-50', textClass: 'text-amber-600', hoverClass: 'hover:bg-amber-100', to: '/admin/points-history' },
  { id: 'checkin-admin', label: '活動簽到', icon: 'qr_code_scanner', bgClass: 'bg-emerald-50', textClass: 'text-emerald-600', hoverClass: 'hover:bg-emerald-100', to: '/admin/checkin' }
]

export const MEMBER_MENU_ITEMS: MenuConfigItem[] = [
  // 依據你原先 unshift 的順序：raffle 會在最前面，接著是 checkin
  { id: 'raffle-member', label: '抽獎設置', icon: 'casino', bgClass: 'bg-rose-50', textClass: 'text-rose-600', hoverClass: 'hover:bg-rose-100', to: '/admin/raffle', roles: ['admin', 'raffle_staff'] },
  { id: 'checkin-member', label: '活動簽到', icon: 'qr_code_scanner', bgClass: 'bg-emerald-50', textClass: 'text-emerald-600', hoverClass: 'hover:bg-emerald-100', to: '/admin/checkin', roles: ['admin', 'staff'] },
  { id: 'home', label: '首頁', icon: 'home', bgClass: 'bg-slate-50', textClass: 'text-slate-600', hoverClass: 'hover:bg-slate-100', to: '/home' },
  { id: 'events', label: '活動中心', icon: 'event', bgClass: 'bg-sky-50', textClass: 'text-sky-600', hoverClass: 'hover:bg-sky-100', to: '/events' },
  { id: 'points-history', label: '點數紀錄', icon: 'history', bgClass: 'bg-amber-50', textClass: 'text-amber-600', hoverClass: 'hover:bg-amber-100', to: '/points-history' }
]

export const LOGOUT_ITEM: MenuConfigItem = {
  id: 'logout',
  label: '登出帳號',
  icon: 'logout',
  bgClass: 'bg-red-50',
  textClass: 'text-red-600',
  hoverClass: 'hover:bg-red-100',
  actionType: 'logout'
}