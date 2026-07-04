export type Role = 'admin' | 'member' | 'staff'

export const ROLE_LABEL: Record<Role, string> = {
  admin: '管理員',
  member: '會員',
  staff: '工作人員'
}

export type PaymentStatusTone = 'success' | 'danger'

export interface PaymentStatusSummary {
  hasDonationYear: boolean
  hasRegistrationFee: boolean
  hasAnyPayment: boolean
  label: string
  tone: PaymentStatusTone
}
