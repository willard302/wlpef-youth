import type { Role, TabbarItem } from '@/types'

export const getTabbarItems = (role?: Role): Omit<TabbarItem, 'fill'>[] => {
  const items: Omit<TabbarItem, 'fill'>[] = [
    { key: 'home', label: '首頁', icon: 'home', path: '/home' },
  ]

  if (role === 'admin') {
    items.push(
      { key: 'scan', label: '簽到掃描', icon: 'qr_code_scanner', path: '/admin/checkin' },
      { key: 'settings', label: '管理設定', icon: 'settings', path: '/admin/settings' }
    )
  } else {
    items.push(
      { key: 'qr-code', label: 'QR Code', icon: 'qr_code_2', path: '' },
      { key: 'events', label: '活動中心', icon: 'event', path: '/events' }
    )
  }

  return items
}
