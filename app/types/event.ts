export type EventStatus = 'draft' | 'published' | 'closed'

export interface Event {
  allDay: boolean
  checkinBonus: number

  createdBy: string
  description: string
  endAt: Date
  googleFormUrl?: string
  googleSheetId?: string
  id: string
  location: string
  
  raffleThreshold: number
  registrationBonus: number
  startAt: Date
  status: EventStatus
  title: string
  
  // Derived display fields
  date: Date        // alias of startAt for calendar grid lookup
  time: string      // 'HH:mm' formatted from startAt
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
  // Joined fields
  userName?: string
  userAvatar?: string
}
