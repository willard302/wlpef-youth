import type { TabbarKey } from '@/types'

declare module '#app' {
  interface PageMeta {
    showTabbar?: boolean
    tabbarKey?: TabbarKey
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    showTabbar?: boolean
    tabbarKey?: TabbarKey
  }
}

export {}
