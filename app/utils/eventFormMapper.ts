import { addHours, format, parseISO, set } from 'date-fns'
import type { CreateEventPayload, EventFormData, EventStatus, EventRow, FeedbackVisibilityMode } from '~/types'

export const createDefaultEventFormData = (): EventFormData => ({
  title: '',
  description: '',
  location: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  allDay: false,
  status: 'draft',
  googleFormUrl: '',
  googleSheetId: '',
  feedbackFormUrl: '',
  feedbackResponseSheetId: '',
  feedbackBonusPoints: 0,
  feedbackVisibilityMode: 'test',
  checkinFormUrl: '',
  checkinResponseSheetId: '',
  checkinFormBonusPoints: 0,
  checkinVisibilityMode: 'test',
  checkinFormSyncEnabled: false,
  registrationBonus: 0,
  checkinBonus: 0,
  raffleThreshold: 0,
})

export const createDefaultEventFormDataForDate = (dateStr?: string): EventFormData => {
  const base = dateStr ? parseISO(dateStr) : new Date()
  const start = set(base, { hours: 14, minutes: 0, seconds: 0, milliseconds: 0 })
  const end = addHours(start, 1.5)

  return {
    ...createDefaultEventFormData(),
    startDate: format(start, 'yyyy-MM-dd'),
    startTime: format(start, 'HH:mm'),
    endDate: format(end, 'yyyy-MM-dd'),
    endTime: format(end, 'HH:mm'),
  }
}

export const eventRowToFormData = (event: EventRow): EventFormData => {
  const startAt = parseISO(event.start_at)
  const endAt = parseISO(event.end_at)
  const allDay = event.all_day ?? false

  return {
    ...createDefaultEventFormData(),
    title: event.title,
    description: event.description ?? '',
    location: event.location ?? '',
    startDate: format(startAt, 'yyyy-MM-dd'),
    startTime: allDay ? '00:00' : format(startAt, 'HH:mm'),
    endDate: format(endAt, 'yyyy-MM-dd'),
    endTime: allDay ? '23:59' : format(endAt, 'HH:mm'),
    allDay,
    status: (event.status ?? 'draft') as EventStatus,
    googleFormUrl: event.google_form_url ?? '',
    googleSheetId: event.google_sheet_id ?? '',
    feedbackFormUrl: event.feedback_form_url ?? '',
    feedbackResponseSheetId: event.feedback_response_sheet_id ?? '',
    feedbackBonusPoints: event.feedback_bonus_points ?? 0,
    feedbackVisibilityMode: (event.feedback_visibility_mode ?? 'test') as FeedbackVisibilityMode,
    checkinFormUrl: event.checkin_form_url ?? '',
    checkinResponseSheetId: event.checkin_response_sheet_id ?? '',
    checkinFormBonusPoints: event.checkin_form_bonus_points ?? 0,
    checkinVisibilityMode: (event.checkin_visibility_mode ?? 'test') as FeedbackVisibilityMode,
    checkinFormSyncEnabled: event.checkin_form_sync_enabled ?? false,
    registrationBonus: event.registration_bonus ?? 0,
    checkinBonus: event.checkin_bonus ?? 0,
    raffleThreshold: event.raffle_threshold ?? 0,
  }
}

export const eventFormDataToCreatePayload = (formData: EventFormData): CreateEventPayload => ({
  title: formData.title.trim(),
  description: formData.description.trim() || undefined,
  location: formData.location.trim() || undefined,
  start_at: new Date(`${formData.startDate}T${formData.startTime}`).toISOString(),
  end_at: new Date(`${formData.endDate}T${formData.endTime}`).toISOString(),
  all_day: formData.allDay,
  status: formData.status,
  google_sheet_id: formData.googleSheetId.trim() || undefined,
  google_form_url: formData.googleFormUrl.trim(),
  feedback_form_url: formData.feedbackFormUrl.trim() || undefined,
  feedback_response_sheet_id: formData.feedbackResponseSheetId.trim() || undefined,
  feedback_bonus_points: Number(formData.feedbackBonusPoints) || 0,
  feedback_visibility_mode: formData.feedbackVisibilityMode,
  checkin_form_url: formData.checkinFormUrl.trim() || undefined,
  checkin_response_sheet_id: formData.checkinResponseSheetId.trim() || undefined,
  checkin_form_bonus_points: Number(formData.checkinFormBonusPoints) || 0,
  checkin_visibility_mode: formData.checkinVisibilityMode,
  checkin_form_sync_enabled: formData.checkinFormSyncEnabled,
  registration_bonus: Number(formData.registrationBonus) || 0,
  checkin_bonus: Number(formData.checkinBonus) || 0,
  raffle_threshold: Number(formData.raffleThreshold) || 0,
})
