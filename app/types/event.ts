export type EventStatus = 'draft' | 'published' | 'closed'
export type FeedbackVisibilityMode = 'test' | 'live'

export interface Activity {
  type: 'event'
  date: string
  title: string
  duration: string
  icon: string
}

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
  feedbackFormUrl?: string
  feedbackResponseSheetId?: string
  feedbackBonusPoints: number
  feedbackVisibilityMode: FeedbackVisibilityMode
  checkinFormUrl?: string
  checkinResponseSheetId?: string
  checkinFormBonusPoints: number
  checkinVisibilityMode: FeedbackVisibilityMode
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
  feedback_form_url?: string
  feedback_response_sheet_id?: string
  feedback_bonus_points?: number
  feedback_visibility_mode?: FeedbackVisibilityMode
  checkin_form_url?: string
  checkin_response_sheet_id?: string
  checkin_form_bonus_points?: number
  checkin_visibility_mode?: FeedbackVisibilityMode
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
