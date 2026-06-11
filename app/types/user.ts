export type Role = 'admin' | 'member'

export const ROLE_LABEL: Record<Role, string> = {
  admin: '管理員',
  member: '一般成員',
}

export interface UserProfile {
  id: string
  email: string
  name: string
  role: Role
  scanPermission: boolean
  joinDate: string
  points: number
  avatar?: string
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
