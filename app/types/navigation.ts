export type TabbarKey = 'home' | 'qr-code' | 'events' | 'scan'

export interface TabbarItem {
  key: TabbarKey
  label: string
  icon: string
  path: string
  fill?: boolean
}
