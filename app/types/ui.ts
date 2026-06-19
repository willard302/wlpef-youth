export interface MenuAction {
  (): void
}

export interface MenuItem {
  id: string
  label: string
  icon: string
  bgClass: string
  textClass: string
  hoverClass: string
  visible: boolean
  action: MenuAction
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration: number
}
