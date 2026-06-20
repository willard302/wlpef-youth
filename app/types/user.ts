export type Role = 'admin' | 'member' | 'staff'

export const ROLE_LABEL: Record<Role, string> = {
  admin: '管理員',
  member: '會員',
  staff: '工作人員'
}
