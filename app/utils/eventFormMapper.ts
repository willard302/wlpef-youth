import { addHours, format, parseISO, set } from 'date-fns'
import type { CreateEventPayload, EventFormData, EventRow } from '~/types'

export const createDefaultEventFormData = (): EventFormData => ({
  title: '',
  description: '',
  location: '',
  start_date: '',
  start_time: '',
  start_at: '',
  end_date: '',
  end_time: '',
  end_at: '',
  all_day: false,
  status: 'draft',
  google_form_url: '',
  google_sheet_id: '',
  feedback_form_url: '',
  feedback_response_sheet_id: '',
  feedback_bonus_points: 0,
  feedback_visibility_mode: 'test',
  checkin_form_url: '',
  checkin_response_sheet_id: '',
  checkin_form_bonus_points: 0,
  checkin_visibility_mode: 'test',
  checkin_form_sync_enabled: false,
  registration_bonus: 0,
  checkin_bonus: 0,
  raffle_threshold: 0,
})

export const createDefaultEventFormDataForDate = (dateStr?: string): EventFormData => {
  const base = dateStr ? parseISO(dateStr) : new Date()
  const start = set(base, { hours: 14, minutes: 0, seconds: 0, milliseconds: 0 })
  const end = addHours(start, 1.5)

  return {
    ...createDefaultEventFormData(),
    start_date: format(start, 'yyyy-MM-dd'),
    start_time: format(start, 'HH:mm'),
    end_date: format(end, 'yyyy-MM-dd'),
    end_time: format(end, 'HH:mm'),
  }
}

export const eventRowToFormData = (event: EventRow): EventFormData => {
  const startAt = parseISO(event.start_at)
  const endAt = parseISO(event.end_at)
  const all_day = event.all_day ?? false

  return {
    ...createDefaultEventFormData(),
    title: event.title,
    description: event.description ?? '',
    location: event.location ?? '',
    start_date: format(startAt, 'yyyy-MM-dd'),
    start_time: all_day ? '00:00' : format(startAt, 'HH:mm'),
    end_date: format(endAt, 'yyyy-MM-dd'),
    end_time: all_day ? '23:59' : format(endAt, 'HH:mm'),
    all_day,
    status: (event.status ?? 'draft') as string,
    google_form_url: event.google_form_url ?? '',
    google_sheet_id: event.google_sheet_id ?? '',
    feedback_form_url: event.feedback_form_url ?? '',
    feedback_response_sheet_id: event.feedback_response_sheet_id ?? '',
    feedback_bonus_points: event.feedback_bonus_points ?? 0,
    feedback_visibility_mode: event.feedback_visibility_mode ?? 'test',
    checkin_form_url: event.checkin_form_url ?? '',
    checkin_response_sheet_id: event.checkin_response_sheet_id ?? '',
    checkin_form_bonus_points: event.checkin_form_bonus_points ?? 0,
    checkin_visibility_mode: event.checkin_visibility_mode ?? 'test',
    checkin_form_sync_enabled: event.checkin_form_sync_enabled ?? false,
    registration_bonus: event.registration_bonus ?? 0,
    checkin_bonus: event.checkin_bonus ?? 0,
    raffle_threshold: event.raffle_threshold ?? 0,
  }
}

export const eventFormDataToCreatePayload = (formData: EventFormData): CreateEventPayload => ({
  title: formData.title.trim(),
  description: formData.description!.trim() || undefined,
  location: formData.location!.trim() || undefined,
  start_at: formData.start_at,
  end_at: formData.end_at,
  all_day: formData.all_day,
  status: formData.status,
  google_sheet_id: formData.google_sheet_id!.trim() || undefined,
  google_form_url: formData.google_form_url!.trim(),
  feedback_form_url: formData.feedback_form_url!.trim() || undefined,
  feedback_response_sheet_id: formData.feedback_response_sheet_id!.trim() || undefined,
  feedback_bonus_points: Number(formData.feedback_bonus_points) || 0,
  feedback_visibility_mode: formData.feedback_visibility_mode,
  checkin_form_url: formData.checkin_form_url!.trim() || undefined,
  checkin_response_sheet_id: formData.checkin_response_sheet_id!.trim() || undefined,
  checkin_form_bonus_points: Number(formData.checkin_form_bonus_points) || 0,
  checkin_visibility_mode: formData.checkin_visibility_mode,
  checkin_form_sync_enabled: formData.checkin_form_sync_enabled,
  registration_bonus: Number(formData.registration_bonus) || 0,
  checkin_bonus: Number(formData.checkin_bonus) || 0,
  raffle_threshold: Number(formData.raffle_threshold) || 0,
})
