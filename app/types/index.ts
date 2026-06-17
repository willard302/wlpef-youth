/**
 * Tabbar Items
 */
export type TabbarKey = 'home' | 'qr-code' | 'events' | 'scan'  

export interface TabbarItem {
  key: TabbarKey
  label: string
  icon: string
  path: string
  fill?: boolean
}

/**
 * Common Data Types
 */
export * from './event'

export interface Activity {
  type: 'event'
  date: string
  title: string
  duration: string
  icon: string
}

/**
 * Form Data
 */


export interface GoogleSignupFormData {
  fullName: string
  points: number
}

/**
 * UI Components
 */

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

export * from './user'
