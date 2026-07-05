
import type { Database, Event, EventCheckin, EventRegistration, PointTransaction, CheckinScanResult } from '~/types'

const getSupabase = () => useSupabaseClient<Database>()

export const eventAdminService = {

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
  async syncGoogleSheet(
    eventId: string,
    options: {
      sheetId?: string
      feedbackSheetId?: string
      syncTarget?: 'registration' | 'feedback' | 'both'
    }
  ): Promise<any> {
    const supabase = getSupabase()
    const { sheetId, feedbackSheetId, syncTarget = 'registration' } = options
    const { data, error } = await supabase.functions.invoke('sync-google-sheet', {
      body: { eventId, sheetId, feedbackSheetId, syncTarget }
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

  async verifyOperatorScanPermission(): Promise<void> {
    const supabase = getSupabase()
    const { data: { user: operatorUser } } = await supabase.auth.getUser()

    if (!operatorUser) throw new Error('使用者未登入')

    const { data, error } = await supabase
      .from('profiles')
      .select('role, scan_permission')
      .eq('id', operatorUser.id)
      .maybeSingle()
    
    if (error) throw error
    if (!data) throw new Error('找不到操作者資料')

    if (!data.role) throw new Error('操作者沒有設定角色')
    const canScan = ['admin', 'staff'].includes(data.role)

    if (!canScan) throw new Error('您沒有簽到掃描權限')
  },

  /**
   * 管理員為會員進行簽到
   * @param eventId 活動 ID
   * @param memberId 會員 ID (來自 QR Code)
   */
  async checkInMember(eventId: string, memberId: string): Promise<CheckinScanResult> {
    const supabase = getSupabase()
    const { data: { user: operatorUser } } = await supabase.auth.getUser()

    const [memberRes, existingCheckinRes, registrationRes] = await Promise.all([
      supabase.from('profiles').select('email').eq('id', memberId).maybeSingle(),
      supabase.from('checkin_records').select('id').eq('event_id', eventId).eq('user_id', memberId).maybeSingle(),
      supabase.from('event_registrations').select('id, donation_year, registration_fee').eq('event_id', eventId).eq('matched_user_id', memberId).maybeSingle()
    ])
    
    if (memberRes.error) throw memberRes.error
    if (!memberRes.data) throw new Error('找不到該會員資料')
    if (existingCheckinRes.data) throw new Error('該會員已經完成簽到')

    const donationYear = registrationRes.data?.donation_year ?? false
    const registrationFee = registrationRes.data?.registration_fee ?? false
    const hasAnyPayment = donationYear || registrationFee

    // 執行簽到
    const { error: checkinError } = await supabase
      .from('checkin_records')
      .insert({
        event_id: eventId,
        user_id: memberId,
        registration_id: registrationRes.data?.id || null,
        email: memberRes.data.email || '',
        checkin_method: 'qr_code',
        checked_in_by: operatorUser?.id
      })

    if (checkinError) throw checkinError

    return {
      registrationId: registrationRes.data?.id || null,
      donationYear,
      registrationFee,
      hasAnyPayment,
      paymentMessage: hasAnyPayment ? '簽到成功，請直接入場' : '簽到成功，請前往繳費',
      paymentLevel: hasAnyPayment ? 'success' : 'danger',
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
  },

    // (管理員) 取得系統中所有的點數交易紀錄
  async fetchAllPointTransactions(): Promise<PointTransaction[]> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('point_transactions')
        .select(`*, events(title), profiles(name, email)`)
        .order('created_at', { ascending: false })
        .limit(1000)

      if (error) throw error

      return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        eventId: row.event_id,
        points: row.points,
        type: row.type,
        description: row.description,
        createdAt: row.created_at,
        eventTitle: row.events?.title,
        userName: row.profiles?.name,
        userEmail: row.profiles?.email
      }))
    } catch (error: any) {
      console.error('Error fetching all point transactions:', error)
      throw error
    }
  },

}
