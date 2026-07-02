export type EventStatus = 'draft' | 'published' | 'closed'

export interface RafflePrize {
  prize: string
  name: string
  count: number
  drawOrder: number
}

export interface Event {
  id: string
  title: string
  description: string
  location: string
  startAt: Date
  endAt: Date
  allDay: boolean
  status: EventStatus
  createdBy: string
  googleFormUrl?: string
  googleSheetId?: string
  registrationBonus: number
  checkinBonus: number
  raffleThreshold: number
  rafflePrizes?: RafflePrize[]
  
  // Derived display fields
  date: Date
  time: string
  period: 'AM' | 'PM'
  isRegistered?: boolean
  isCheckedIn?: boolean
}

export interface CreateEventPayload {
  title: string
  description?: string
  location?: string
  start_at: string  // ISO8601
  end_at: string    // ISO8601
  all_day?: boolean
  status?: EventStatus
  google_sheet_id?: string
  google_form_url: string
  registration_bonus?: number
  checkin_bonus?: number
  raffle_threshold?: number
  raffle_prizes?: Array<{ prize: string; name: string; count: number; drawOrder: number }>
}

export interface EventRegistration {
  id: string
  eventId: string
  matchedUserId: string | null
  email: string
  name: string | null
  googleSheetRowId: string | null
  formSubmittedAt: Date
  syncedAt: Date | null
  donationYear: boolean
  registrationFee: boolean
  firstLoginEnabled: boolean
  registrationPointsGrantedAt: Date | null
  rawData?: Record<string, any>
  createdAt: Date
}

export interface EventCheckin {
  id: string
  eventId: string
  userId: string
  registrationId: string | null
  email: string
  checkinMethod: string | null
  checkedInBy: string | null
  checkedInAt: Date
  checkinPointsGrantedAt: Date | null
  createdAt: Date
  userName?: string
  userAvatar?: string
}
