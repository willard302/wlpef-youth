import type { TabbarItem } from '@/types'
import { baseTabbarItems } from '@/config/tabbar'

export const useTabbarConfig = () => {
  const route = useRoute()

  const routeToIndexMap: Record<string, number> = {
    '/': 0,
    '/home': 0,
    '/user-center/qr-code': 1,
    '/user-center': 2
  }

  const activeIndex = computed(() => {
    if (route.path === '/user-center/qr-code') return 1
    if (route.path.startsWith('/user-center')) return 2
    return 0
  })

  const tabbarItems = computed<TabbarItem[]>(() => {
    return baseTabbarItems.map((item, index) => ({
      ...item,
      fill: index === activeIndex.value
    }))
  })

  return {
    tabbarItems,
    activeIndex
  }
}