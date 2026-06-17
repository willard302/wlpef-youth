import type { ProfileRow } from './database'

export type Role = 'admin' | 'member'

export const ROLE_LABEL: Record<Role, string> = {
  admin: '管理員',
  member: '會員'
}

export interface PointTransaction {
  id: string
  userId: string
  eventId: string | null
  points: number
  type: string
  description: string | null
  createdAt: string
  eventTitle?: string
  userName?: string
  userEmail?: string
}
