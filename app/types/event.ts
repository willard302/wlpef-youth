import type { EventInsert, EventRow } from './database'

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

type EventBase = {
  id: EventRowValue<'id'>
  title: EventRowValue<'title'>
  description: EventRowValue<'description'>
  location: EventRowValue<'location'>
  startAt: Date
  endAt: Date
  allDay: EventRowValue<'all_day'>
  status: EventStatus
  createdBy: EventRowValue<'created_by'>
  googleFormUrl?: EventRowValue<'google_form_url'>
  googleSheetId?: EventRowValue<'google_sheet_id'>
  feedbackFormUrl?: EventRowValue<'feedback_form_url'>
  feedbackResponseSheetId?: EventRowValue<'feedback_response_sheet_id'>
  feedbackBonusPoints: EventRowValue<'feedback_bonus_points'>
  feedbackVisibilityMode: FeedbackVisibilityMode
  checkinFormUrl?: EventRowValue<'checkin_form_url'>
  checkinResponseSheetId?: EventRowValue<'checkin_response_sheet_id'>
  checkinFormBonusPoints: EventRowValue<'checkin_form_bonus_points'>
  checkinVisibilityMode: FeedbackVisibilityMode
  checkinFormSyncEnabled: EventRowValue<'checkin_form_sync_enabled'>
  registrationBonus: EventRowValue<'registration_bonus'>
  checkinBonus: EventRowValue<'checkin_bonus'>
  raffleThreshold: EventRowValue<'raffle_threshold'>
  rafflePrizes?: RafflePrize[]
}

export type EventRowValue<K extends keyof EventRow> = NonNullable<EventRow[K]>
type EventInsertValue<K extends keyof EventInsert> = NonNullable<EventInsert[K]>

export type EventStatus = EventInsertValue<'status'>
export type FeedbackVisibilityMode = EventInsertValue<'feedback_visibility_mode'>

export type CreateEventPayload = Omit<EventInsert, 'created_by' | 'created_at' | 'id'>

export interface EventFormData {
  title: EventInsertValue<'title'>
  description: EventInsertValue<'description'>
  location: EventInsertValue<'location'>
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  allDay: EventInsertValue<'all_day'>
  status: EventStatus
  googleFormUrl: EventInsertValue<'google_form_url'>
  googleSheetId: EventInsertValue<'google_sheet_id'>
  feedbackFormUrl: EventInsertValue<'feedback_form_url'>
  feedbackResponseSheetId: EventInsertValue<'feedback_response_sheet_id'>
  feedbackBonusPoints: EventInsertValue<'feedback_bonus_points'>
  feedbackVisibilityMode: FeedbackVisibilityMode
  checkinFormUrl: EventInsertValue<'checkin_form_url'>
  checkinResponseSheetId: EventInsertValue<'checkin_response_sheet_id'>
  checkinFormBonusPoints: EventInsertValue<'checkin_form_bonus_points'>
  checkinVisibilityMode: FeedbackVisibilityMode
  checkinFormSyncEnabled: EventInsertValue<'checkin_form_sync_enabled'>
  registrationBonus: EventInsertValue<'registration_bonus'>
  checkinBonus: EventInsertValue<'checkin_bonus'>
  raffleThreshold: EventInsertValue<'raffle_threshold'>
}

export type Event = EventBase & {
  date: Date
  time: string
  period: 'AM' | 'PM'
  isRegistered?: boolean
  isCheckedIn?: boolean
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

export interface EventModalProps {
  show: boolean
  selectedEvent: Event | null
  canViewAllEventStatus?: boolean
  canSeeStaffFeatures?: boolean
  isRegistered?: boolean
  isCheckedIn?: boolean
  isFeedbackSubmitted?: boolean
  isCheckinFormSubmitted?: boolean
  checkingRegistration?: boolean
}

export interface EventModalEmits {
  (e: 'update:show', val: boolean): void,
  (e: 'register'): void,
  (e: 'feedback'): void,
  (e: 'checkin-form'): void
}
