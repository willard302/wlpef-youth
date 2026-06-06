import type { TabbarItem } from '@/types'

export const baseTabbarItems: Omit<TabbarItem, 'fill'>[] = [
  { label: '首頁', icon: 'home', path: '/home' },
  { label: '報到碼', icon: 'qr_code_2', path: '/user-center/qr-code' },
  { label: '會員中心', icon: 'person', path: '/user-center' },
]

export const getTabbarItems = (currentPath: string): TabbarItem[] => {
  return baseTabbarItems.map(item => ({
    ...item,
    fill: item.path === currentPath || (item.path === '/home' && currentPath === '/'),
  }))
}

export const tabbarActiveIndexMap: Record<string, number> = baseTabbarItems.reduce(
  (map, item, index) => {
    map[item.path] = index
    return map
  },
  { '/': 0 } as Record<string, number>,
)
