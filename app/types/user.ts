export type Role = 'admin' | 'member'

export const ROLE_LABEL: Record<Role, string> = {
  admin: '管理員',
  member: '一般成員',
}

export interface UserProfile {
  id: string
  name: string
  role: Role
  joinDate: string
  department: string
  points: number
  phoneNumber?: string
  avatar?: string
  gender?: string
  bio?: string
}

export interface UserInfoFormData {
  name: string
  department: string
  phoneNumber: string
  gender: string
  bio: string
}

export type UserInfoFormDataKey = keyof UserInfoFormData

export interface FormFieldDefinition {
  key: UserInfoFormDataKey
  label: string
  icon: string
  placeholder: string
  type: string
  options?: { label: string; value: string }[]
  rows?: number
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
}
