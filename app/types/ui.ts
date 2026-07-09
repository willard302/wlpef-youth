export interface MenuConfigItem {
  id: string
  label: string
  icon: string
  bgClass: string
  textClass: string
  hoverClass: string
  to?: string          // 跳轉的路徑
  actionType?: 'logout' // 特殊操作識別
  roles?: string[]     // 允許存取的角色，未填代表不限
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration: number
}
