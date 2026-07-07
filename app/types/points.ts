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

export type PointTransactionKind = 'registration' | 'checkin' | 'feedback' | 'checkin_form' | 'bonus' | 'manual'

export interface PointTransactionMeta {
  label: string
  icon: string
  colorClass: string
}
