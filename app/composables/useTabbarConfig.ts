import type { TabbarItem, TabbarKey } from '~/types'
import { getTabbarItems } from '~/config/tabbar'

const PATH_MAP: Record<string, TabbarKey> = {
  '/': 'home',
  '/home': 'home',
  '/points-history': 'events'
}

export const useTabbarConfig = () => {
  const route = useRoute()

  const activeTabbarKey = computed<TabbarKey>(() => {
    const metaKey = route.meta.tabbarKey as TabbarKey | undefined
    if (metaKey) return metaKey

    const path = route.path
    if (PATH_MAP[path]) return PATH_MAP[path]
    if (path.startsWith('/events')) return 'events'
    return 'home'
  })

  const tabbarItems = computed<TabbarItem[]>(() => {
    return getTabbarItems().map(item => ({
      ...item,
      fill: item.key === activeTabbarKey.value,
    }))
  })

  const activeIndex = computed(() => {
    const index = tabbarItems.value.findIndex(item => item.key === activeTabbarKey.value)
    return index >= 0 ? index : 0
  })

  return {
    tabbarItems,
    activeIndex
  }
}
