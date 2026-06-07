/**
 * Tabbar Items
 */
export type TabbarKey = 'home' | 'qr-code' | 'user-center' | 'settings'

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
export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  email: string
  fullName: string
  department: string
  password: string
  confirmPassword: string
}

export interface GoogleSignupFormData {
  fullName: string
  points: number
  department: string
  dateOfBirth: string
  gender: string
  bio: string
}

/**
 * UI Components
 */
export interface MenuItem {
  icon: string
  label: string
  path?: string
}

export interface MenuSection {
  title: string
  items: MenuItem[]
}

export interface StatCard {
  icon: string
  label: string
  value: string
}

export * from './user'
