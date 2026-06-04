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
  targetId?: string
  subdomain?: string
  registrationBonus: number
  checkinBonus: number
  socialLeaderboard: boolean
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
  target_id?: string
  subdomain?: string
  registration_bonus?: number
  checkin_bonus?: number
  social_leaderboard?: boolean
  raffle_threshold?: number
}
