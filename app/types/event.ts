export type EventStatus = 'draft' | 'published' | 'closed'

export interface Event {
  id: string
  title: string
  description: string
  location: string
  startAt: Date
  endAt: Date
  allDay: boolean
  color: string
  createdBy: string
  attendees: number
  status: EventStatus
  googleSheetId?: string
  googleFormUrl?: string
  targetId?: string
  subdomain?: string
  registrationBonus: number
  checkinBonus: number
  raffleThreshold: number
  // Derived display fields
  date: Date        // alias of startAt for calendar grid lookup
  time: string      // 'HH:mm' formatted from startAt
  period: 'AM' | 'PM'
}

export interface CreateEventPayload {
  title: string
  description?: string
  location?: string
  start_at: string  // ISO8601
  end_at: string    // ISO8601
  all_day?: boolean
  color?: string
  status?: EventStatus
  google_sheet_id?: string
  google_form_url: string
  target_id?: string
  subdomain?: string
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
