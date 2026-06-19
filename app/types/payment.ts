export type PaymentStatusTone = 'success' | 'danger'

export interface PaymentStatusSummary {
  hasDonationYear: boolean
  hasRegistrationFee: boolean
  hasAnyPayment: boolean
  label: string
  tone: PaymentStatusTone
}
