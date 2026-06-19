export interface CheckinScanResult {
  registrationId: string | null
  donationYear: boolean
  registrationFee: boolean
  hasAnyPayment: boolean
  paymentMessage: string
  paymentLevel: 'success' | 'danger'
}