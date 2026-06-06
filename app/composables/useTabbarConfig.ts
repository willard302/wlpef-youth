import type { TabbarItem } from '@/types'
import { getTabbarItems } from '@/config/tabbar'

export const useTabbarConfig = () => {
  const route = useRoute()
  const { userProfile } = useUser()

  const activeIndex = computed(() => {
    const role = userProfile.value?.role
    if (role === 'admin') {
      if (route.path.startsWith('/user-center')) return 1
      return 0
    } else {
      if (route.path === '/user-center/qr-code') return 1
      if (route.path.startsWith('/user-center')) return 2
      return 0
    }
  })

  const tabbarItems = computed<TabbarItem[]>(() => {
    return getTabbarItems(route.path, userProfile.value?.role)
  })

  return {
    tabbarItems,
    activeIndex
  }
}