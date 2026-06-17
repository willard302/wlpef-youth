
import type { Event, EventCheckin, EventRegistration, CreateEventPayload } from '~/types'
import type { Database } from '~/types/database.types'
import type { EventInsert, EventUpdate } from '~/types/database'

const getSupabase = () => useSupabaseClient<Database>()

export const eventAdminService = {

  async createEvent(payload: CreateEventPayload): Promise<Event> {
    validateTimeRange(payload.start_at, payload.end_at)

    const supabase = getSupabase()
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

    const supabase = getSupabase()
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
    const supabase = getSupabase()
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // 獲取所有活動 (管理員專用，不分狀態)
  async fetchAllEventsForAdmin(): Promise<Event[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map(mapToEvent)
  },

  // 獲取特定活動的報名名單  
  async fetchRegistrationsByEventId(eventId: string): Promise<EventRegistration[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .order('form_submitted_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map(mapToRegistration)
  },

  // 獲取特定活動的出席名單 (已完成報名且已簽到)
  async fetchAttendanceByEventId(eventId: string): Promise<EventCheckin[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('checkin_records')
      .select('*, profiles!user_id(name, avatar_url)')
      .eq('event_id', eventId)
      .not('registration_id', 'is', null) // 必須有報名紀錄
      .order('checked_in_at', { ascending: false })

    if (error) throw error
    return (data as any[] ?? []).map(mapToCheckin)
  },

  // 觸發 Google 試算表同步 (呼叫 Edge Function)
  async syncGoogleSheet(eventId: string, sheetId: string): Promise<any> {
    const supabase = getSupabase()
    const { data, error } = await supabase.functions.invoke('sync-google-sheet', {
      body: { eventId, sheetId }
    })

    if (error) throw error
    return data
  },

  // 手動觸發點數結算 (RPC)
  async settleRegistrationPoints(registrationId?: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.rpc('process_event_registration_points', {
      reg_id: registrationId
    })

    if (error) {
      console.error('Error settling points:', error)
      throw new Error('點數結算失敗')
    }
  },

  /**
   * 管理員為會員進行簽到
   * @param eventId 活動 ID
   * @param memberId 會員 ID (來自 QR Code)
   */
  async checkInMember(eventId: string, memberId: string): Promise<void> {
    const supabase = getSupabase()
    const { data: { user: operatorUser } } = await supabase.auth.getUser()
    
    if (!operatorUser) throw new Error('使用者未登入')

    const [operatorRes, memberRes, existingCheckinRes, registrationRes] = await Promise.all([
      supabase.from('profiles').select('role, scan_permission').eq('id', operatorUser.id).maybeSingle(),
      supabase.from('profiles').select('email').eq('id', memberId).maybeSingle(),
      supabase.from('checkin_records').select('id').eq('event_id', eventId).eq('user_id', memberId).maybeSingle(),
      supabase.from('event_registrations').select('id').eq('event_id', eventId).eq('matched_user_id', memberId).maybeSingle()
    ])

    if (operatorRes.error) throw operatorRes.error
    if (memberRes.error) throw memberRes.error

    const canScan = operatorRes.data?.role === 'admin' || operatorRes.data?.scan_permission === true
    if (!canScan) throw new Error('您沒有簽到掃描權限')
    if (!memberRes.data) throw new Error('找不到該會員資料')
    if (!existingCheckinRes.data) throw new Error('該會員已經完成簽到')

    // 執行簽到
    const { error: checkinError } = await supabase
      .from('checkin_records')
      .insert({
        event_id: eventId,
        user_id: memberId,
        registration_id: registrationRes.data?.id || null,
        email: memberRes.data.email || '',
        checkin_method: 'qr_code',
        checked_in_by: operatorUser.id
      })

    if (checkinError) throw checkinError

    // 立即觸發點數結算 (選用)
    try {
      await supabase.rpc('process_pending_points')
    } catch (err) {
      console.warn('Point processing skipped or failed:', err)
    }
  },

  // 獲取管理後台統計數據
  async fetchAdminDashboardStats(eventId?: string) {
    const supabase = getSupabase()
    
    // 1. 完成註冊人數 (僅計算 role 為 member 的 profiles)
    const { count: totalProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'member')
    
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

    const [regRes, checkinRes, pointRes] = await Promise.all([
      supabase.from('event_registrations').select('*', {count: 'exact', head: true}).eq('event_id', eventId),
      supabase.from('checkin_records').select('*', {count: 'exact', head: true}).eq('event_id', eventId),
      supabase.from('point_transactions').select('points, type').eq('event_id', eventId)
    ])

    if (regRes.error) throw regRes.error
    if (checkinRes.error) throw checkinRes.error
    if (pointRes.error) throw pointRes.error

    const pointsBreakdown = (pointRes.data || []).reduce(
      (acc, curr) => {
        if (curr.type === 'registration') acc.registration += curr.points
        else if (curr.type === 'checkin') acc.checkin += curr.points
        return acc
      },
      { registration: 0, checkin: 0 }
    )

    return {
      totalProfiles: totalProfiles || 0,
      eventRegistrations: regRes.count || 0,
      eventCheckins: checkinRes.count || 0,
      totalPoints: pointsBreakdown.registration + pointsBreakdown.checkin,
      pointsBreakdown
    }
  }

}