import { addMonths, endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns'
import type { CreateEventPayload, Event, EventRegistration, EventStatus } from '@/types'
import type { Database } from '@/types/database.types'

type EventRow = Database['public']['Tables']['events']['Row']
type EventInsert = Database['public']['Tables']['events']['Insert']
type EventUpdate = Database['public']['Tables']['events']['Update']

type RegistrationRow = Database['public']['Tables']['event_registrations']['Row']
type CheckinRow = Database['public']['Tables']['checkin_records']['Row']

function mapToRegistration(row: RegistrationRow): EventRegistration {
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

function mapToCheckin(row: CheckinRow & { profiles?: { name: string, avatar_url: string | null } }): EventCheckin {
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

function mapToEvent(row: EventRow): Event {
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
    color: row.color ?? '#38bdf8',
    createdBy: row.created_by ?? '',
    attendees: row.participants?.length ?? 0,
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

function validateTimeRange(startAtIso: string, endAtIso: string) {
  const start = parseISO(startAtIso)
  const end = parseISO(endAtIso)
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)

  if (end <= start) throw new Error('結束時間必須晚於開始時間')
  if (diffDays > 7) throw new Error('活動期間不能超過 7 天')
}

function getMonthRange(yearMonth?: string) {
  const pivot = yearMonth ? parseISO(`${yearMonth}-01`) : new Date()
  const start = startOfMonth(subMonths(pivot, 1)).toISOString()
  const end = endOfMonth(addMonths(pivot, 1)).toISOString()

  return { start, end }
}

export const eventService = {
  async fetchEvents(yearMonth?: string): Promise<Event[]> {
    const supabase = useSupabaseClient<Database>()
    const { start, end } = getMonthRange(yearMonth)

    // Fetch events that overlap with the range or have no start_at (though they shouldn't)
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .or(`start_at.lte.${end},end_at.gte.${start}`)
      .order('start_at', { ascending: true })

    if (error) throw error
    return (data ?? []).map(mapToEvent)
  },

  async fetchOngoingEvents(status?: EventStatus): Promise<Event[]> {
    const supabase = useSupabaseClient<Database>()
    const now = new Date().toISOString()

    let query = supabase
      .from('events')
      .select('*')
      .lte('start_at', now)
      .gte('end_at', now)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
      .order('start_at', { ascending: true })

    if (error) throw error
    return (data ?? []).map(mapToEvent)
  },

  async fetchUpcomingEvents(limit = 5, status?: EventStatus): Promise<Event[]> {
    const supabase = useSupabaseClient<Database>()

    let query = supabase
      .from('events')
      .select('*')
      .gte('start_at', new Date().toISOString())

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
      .order('start_at', { ascending: true })
      .limit(limit)

    if (error) throw error
    return (data ?? []).map(mapToEvent)
  },

  async fetchEventById(id: string): Promise<Event> {
    const supabase = useSupabaseClient<Database>()
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return mapToEvent(data)
  },

  async createEvent(payload: CreateEventPayload): Promise<Event> {
    validateTimeRange(payload.start_at, payload.end_at)

    const supabase = useSupabaseClient<Database>()
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError) throw authError
    if (!authData.user) throw new Error('請先登入後再新增活動')

    const insertPayload: EventInsert = {
      ...payload,
      created_by: authData.user.id,
    }

    const { data, error } = await supabase
      .from('events')
      .insert(insertPayload)
      .select()
      .single()

    if (error) throw error
    return mapToEvent(data)
  },

  async updateEvent(id: string, payload: Partial<CreateEventPayload>): Promise<Event> {
    if (payload.start_at && payload.end_at) {
      validateTimeRange(payload.start_at, payload.end_at)
    }

    const supabase = useSupabaseClient<Database>()
    const { data, error } = await supabase
      .from('events')
      .update(payload as EventUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return mapToEvent(data)
  },

  async deleteEvent(id: string): Promise<void> {
    const supabase = useSupabaseClient<Database>()
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  /**
   * 檢查使用者是否已報名特定活動
   */
  async checkRegistrationStatus(eventId: string): Promise<boolean> {
    const supabase = useSupabaseClient<Database>()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('event_id', eventId)
      .eq('matched_user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error checking registration status:', error)
      return false
    }

    return !!data
  },

  /**
   * 檢查使用者是否已完成活動簽到
   */
  async checkCheckinStatus(eventId: string): Promise<boolean> {
    const supabase = useSupabaseClient<Database>()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('checkin_records')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error checking checkin status:', error)
      return false
    }

    return !!data
  },

  /**
   * 報名活動 (直接在資料庫建立紀錄)
   */
  async registerForEvent(eventId: string): Promise<void> {
    const supabase = useSupabaseClient<Database>()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('請先登入後再報名')

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .maybeSingle()

    // 1. 在 event_registrations 建立紀錄 (主要用於後台同步與獎勵)
    const { error: regError } = await supabase
      .from('event_registrations')
      .insert({
        event_id: eventId,
        matched_user_id: user.id,
        email: user.email!,
        name: profile?.name || user.user_metadata?.name || 'User',
        form_submitted_at: new Date().toISOString()
      })

    if (regError) {
      if (regError.code === '23505') throw new Error('您已經報名過此活動囉')
      console.error('Registration insert error:', regError)
      throw new Error('報名資料建立失敗')
    }
  },

  /**
   * 手動觸發點數結算 (RPC)
   * 適用於需要即時看到點數異動的場景
   */
  async settleRegistrationPoints(registrationId?: string): Promise<void> {
    const supabase = useSupabaseClient<Database>()
    const { error } = await supabase.rpc('process_event_registration_points', {
      reg_id: registrationId
    })

    if (error) {
      console.error('Error settling points:', error)
      throw new Error('點數結算失敗')
    }
  },

  /**
   * 獲取所有活動 (管理員專用，不分狀態)
   */
  async fetchAllEventsForAdmin(): Promise<Event[]> {
    const supabase = useSupabaseClient<Database>()
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map(mapToEvent)
  },

  /**
   * 獲取特定活動的報名名單
   */
  async fetchRegistrationsByEventId(eventId: string): Promise<EventRegistration[]> {
    const supabase = useSupabaseClient<Database>()
    const { data, error } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .order('form_submitted_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map(mapToRegistration)
  },

  /**
   * 獲取特定活動的出席名單 (已完成報名且已簽到)
   */
  async fetchAttendanceByEventId(eventId: string): Promise<EventCheckin[]> {
    const supabase = useSupabaseClient<Database>()
    const { data, error } = await supabase
      .from('checkin_records')
      .select('*, profiles!user_id(name, avatar_url)')
      .eq('event_id', eventId)
      .not('registration_id', 'is', null) // 必須有報名紀錄
      .order('checked_in_at', { ascending: false })

    if (error) throw error
    return (data as any[] ?? []).map(mapToCheckin)
  },

  /**
   * 觸發 Google 試算表同步 (呼叫 Edge Function)
   */
  async syncGoogleSheet(eventId: string, sheetId: string): Promise<any> {
    const supabase = useSupabaseClient<Database>()
    const { data, error } = await supabase.functions.invoke('sync-google-sheet', {
      body: { eventId, sheetId }
    })

    if (error) throw error
    return data
  },

  /**
   * 管理員為會員進行簽到
   * @param eventId 活動 ID
   * @param memberId 會員 ID (來自 QR Code)
   */
  async checkInMember(eventId: string, memberId: string): Promise<void> {
    const supabase = useSupabaseClient<Database>()
    const { data: { user: operatorUser } } = await supabase.auth.getUser()
    
    if (!operatorUser) throw new Error('使用者未登入')

    const { data: operatorProfile, error: operatorError } = await supabase
      .from('profiles')
      .select('role, scan_permission')
      .eq('id', operatorUser.id)
      .maybeSingle()

    if (operatorError) throw operatorError

    const canScan =
      operatorProfile?.role === 'admin' || operatorProfile?.scan_permission === true

    if (!canScan) {
      throw new Error('您沒有簽到掃描權限')
    }

    // 1. 取得會員資料
    const { data: memberProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', memberId)
      .maybeSingle()

    if (profileError) throw profileError
    if (!memberProfile) throw new Error('找不到該會員資料')

    // 2. 檢查是否已經簽到過
    const { data: existingCheckin } = await supabase
      .from('checkin_records')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', memberId)
      .maybeSingle()

    if (existingCheckin) throw new Error('該會員已經完成簽到')

    // 3. 嘗試找對應的報名紀錄
    const { data: registration } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('event_id', eventId)
      .eq('matched_user_id', memberId)
      .maybeSingle()

    // 4. 執行簽到
    const { error: checkinError } = await supabase
      .from('checkin_records')
      .insert({
        event_id: eventId,
        user_id: memberId,
        registration_id: registration?.id || null,
        email: memberProfile.email || '',
        checkin_method: 'qr_code',
        checked_in_by: operatorUser.id
      })

    if (checkinError) throw checkinError

    // 5. 立即觸發點數結算 (選用)
    try {
      await supabase.rpc('process_pending_points')
    } catch (err) {
      console.warn('Point processing skipped or failed:', err)
    }
  },

  /**
   * 獲取管理後台統計數據
   */
  async fetchAdminDashboardStats(eventId?: string) {
    const supabase = useSupabaseClient<Database>()
    
    // 1. 完成註冊人數 (profiles 總數)
    const { count: totalProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
    if (profileError) throw profileError

    if (!eventId) {
      return {
        totalProfiles: totalProfiles || 0,
        eventRegistrations: 0,
        eventCheckins: 0,
        totalPoints: 0,
        pointsBreakdown: { registration: 0, checkin: 0 }
      }
    }

    // 2. 該活動報名人數
    const { count: registrationCount, error: regError } = await supabase
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
    
    if (regError) throw regError

    // 3. 該活動報到人數
    const { count: checkinCount, error: checkinError } = await supabase
      .from('checkin_records')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
    
    if (checkinError) throw checkinError

    // 4. 點數發放統計 (該活動下)
    const { data: pointData, error: pointError } = await supabase
      .from('point_transactions')
      .select('points, type')
      .eq('event_id', eventId)
    
    if (pointError) throw pointError

    const pointsBreakdown = (pointData || []).reduce(
      (acc, curr) => {
        if (curr.type === 'registration') acc.registration += curr.points
        else if (curr.type === 'checkin') acc.checkin += curr.points
        return acc
      },
      { registration: 0, checkin: 0 }
    )

    return {
      totalProfiles: totalProfiles || 0,
      eventRegistrations: registrationCount || 0,
      eventCheckins: checkinCount || 0,
      totalPoints: pointsBreakdown.registration + pointsBreakdown.checkin,
      pointsBreakdown
    }
  }
}
