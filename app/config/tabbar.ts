import type { TabbarItem, Role } from '@/types'

export const getTabbarItems = (currentPath: string, role?: Role): TabbarItem[] => {
  const items: Omit<TabbarItem, 'fill'>[] = [
    { label: '首頁', icon: 'home', path: '/home' },
  ]

  if (role === 'admin') {
    items.push({ label: '管理設定', icon: 'settings', path: '/user-center' })
  } else {
    items.push(
      { label: '報到碼', icon: 'qr_code_2', path: '/user-center/qr-code' },
      { label: '會員中心', icon: 'person', path: '/user-center' }
    )
  }

  return items.map(item => ({
    ...item,
    fill: item.path === currentPath || (item.path === '/home' && currentPath === '/') || (role === 'admin' && item.path === '/user-center' && currentPath.startsWith('/user-center')),
  }))
}
