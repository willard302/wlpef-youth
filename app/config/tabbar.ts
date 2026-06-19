import type { TabbarItem } from '~/types'

export const getTabbarItems = (): Omit<TabbarItem, 'fill'>[] => {
  return [
    { key: 'home', label: '首頁', icon: 'home', path: '/home' },
    { key: 'qr-code', label: 'QR Code', icon: 'qr_code_2', path: '' },
    { key: 'events', label: '活動中心', icon: 'event', path: '/events' }
  ]
}
