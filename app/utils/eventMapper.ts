import { addMonths, endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns'
import type { EventRegistration, EventCheckin, Event, Role } from '~/types'
import type { RegistrationRow, CheckinRow, EventRow, ProfileRow  } from '~/types/database'

export const mapToRegistration = (row: RegistrationRow): EventRegistration => {
  return {
    id: row.id,
    eventId: row.event_id || '',
    matchedUserId: row.matched_user_id,
    email: row.email,
    name: row.name,
    googleSheetRowId: row.google_sheet_row_id,
    formSubmittedAt: parseISO(row.form_submitted_at || row.created_at as string),
    syncedAt: row.synced_at ? parseISO(row.synced_at) : null,
    registrationPointsGrantedAt: row.registration_points_granted_at ? parseISO(row.registration_points_granted_at) : null,
    rawData: row.raw_data as Record<string, any> | undefined,
    createdAt: parseISO(row.created_at as string),
  }
}

export const mapToCheckin = (row: CheckinRow & { profiles?: { name: string, avatar_url: string | null } }): EventCheckin => {
  return {
    id: row.id,
    eventId: row.event_id || '',
    userId: row.user_id || '',
    registrationId: row.registration_id,
    email: row.email,
    checkinMethod: row.checkin_method,
    checkedInBy: row.checked_in_by,
    checkedInAt: parseISO(row.checked_in_at || row.created_at as string),
    checkinPointsGrantedAt: row.checkin_points_granted_at ? parseISO(row.checkin_points_granted_at) : null,
    createdAt: parseISO(row.created_at as string),
    userName: row.profiles?.name,
    userAvatar: row.profiles?.avatar_url || undefined,
  }
}

export const mapToEvent = (row: EventRow): Event => {
  const startAt = parseISO(row.start_at)
  const endAt = parseISO(row.end_at)
  const hours = startAt.getHours()

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    location: row.location ?? '',
    startAt,
    endAt,
    allDay: row.all_day ?? false,
    createdBy: row.created_by ?? '',
    status: (row.status ?? 'draft') as Event['status'],
    googleSheetId: row.google_sheet_id ?? undefined,
    googleFormUrl: row.google_form_url ?? undefined,
    registrationBonus: row.registration_bonus ?? 0,
    checkinBonus: row.checkin_bonus ?? 0,
    raffleThreshold: row.raffle_threshold ?? 0,
    date: startAt,
    time: row.all_day ? '全天' : format(startAt, 'HH:mm'),
    period: hours < 12 ? 'AM' : 'PM',
  }
}

export const validateTimeRange = (startAtIso: string, endAtIso: string) => {
  const start = parseISO(startAtIso)
  const end = parseISO(endAtIso)
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)

  if (end <= start) throw new Error('結束時間必須晚於開始時間')
  if (diffDays > 7) throw new Error('活動期間不能超過 7 天')
}

export const getMonthRange = (yearMonth?: string) => {
  const pivot = yearMonth ? parseISO(`${yearMonth}-01`) : new Date()
  const start = startOfMonth(subMonths(pivot, 1)).toISOString()
  const end = endOfMonth(addMonths(pivot, 1)).toISOString()

  return { start, end }
}

export const mapProfileRow = (profile: any, user: any = null): ProfileRow => {
  const metadata = user?.user_metadata || {}
  return {
    id: profile?.id || user?.id,
    email: profile?.email || user?.mail,
    name: profile?.name || metadata.name || user?.email?.split('@')[0] || 'User',
    role: (profile?.role as Role) || 'member',
    scan_permission: profile?.scan_permission ?? false,
    created_at: profile?.created_at || metadata.join_date || 'Since 2024',
    points: profile?.points ?? 0,
    avatar_url: profile?.avatar_url || metadata.avatar_url || null,
    updated_at: profile?.updated_at || null
  }
}