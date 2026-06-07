import type { Role, TabbarItem } from '@/types'

export const getTabbarItems = (role?: Role): Omit<TabbarItem, 'fill'>[] => {
  const items: Omit<TabbarItem, 'fill'>[] = [
    { key: 'home', label: '首頁', icon: 'home', path: '/home' },
  ]

  if (role === 'admin') {
    items.push({ key: 'settings', label: '管理設定', icon: 'settings', path: '/admin/settings' })
  } else {
    items.push(
      { key: 'qr-code', label: '報到碼', icon: 'qr_code_2', path: '/user-center/qr-code' },
      { key: 'user-center', label: '會員中心', icon: 'person', path: '/user-center' }
    )
  }

  return items
}
