import type { TabbarItem } from '@/types'
import { baseTabbarItems } from '@/config/tabbar'

export const useTabbarConfig = () => {
  const route = useRoute()

  const routeToIndexMap: Record<string, number> = {
    '/': 0,
    '/user-center': 1
  }

  const activeIndex = computed(() => {
    // 處理子路徑
    if (route.path.startsWith('/user-center')) return 1
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