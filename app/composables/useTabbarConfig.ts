import type { Role, TabbarItem, TabbarKey } from '~/types'
import { getTabbarItems } from '@/config/tabbar'

export const useTabbarConfig = () => {
  const route = useRoute()
  const { userProfile } = useUser()

  const activeTabbarKey = computed<TabbarKey>(() => {
    const metaKey = route.meta.tabbarKey as TabbarKey | undefined
    if (metaKey) return metaKey

    const path = route.path
    if (path === '/' || path === '/home') return 'home'
    if (path.startsWith('/events') || path === '/points-history') return 'events'
    return 'home'
  })

  const tabbarItems = computed<TabbarItem[]>(() => {
    return getTabbarItems(userProfile.value?.role as Role | undefined).map(item => ({
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
