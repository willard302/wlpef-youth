
import type { Database, Event, EventRow, EventStatus } from '~/types'

const getSupabase = () => useSupabaseClient<Database>()

export const eventService = {
  async fetchEvents(yearMonth?: string): Promise<Event[]> {
    const supabase = getSupabase()
    const { start, end } = getMonthRange(yearMonth)

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .or(`start_at.lte.${end},end_at.gte.${start}`)
      .order('start_at', { ascending: true })

    if (error) throw error
    return (data ?? []).map(mapToEvent)
  },

  async fetchOngoingEvents(status?: EventStatus): Promise<Event[]> {
    const supabase = getSupabase()
    const now = new Date().toISOString()

    let query = supabase
      .from('events')
      .select('*')
      .lte('start_at', now)
      .gte('end_at', now)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query.order('start_at', { ascending: true })

    if (error) throw error
    return (data ?? []).map(mapToEvent)
  },

  async fetchUpcomingEvents(limit = 1, status?: EventStatus): Promise<Event[]> {
    const supabase = getSupabase()

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

  async fetchEventById(id: string): Promise<EventRow> {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async deleteEvent(id: string): Promise<void> {
    const supabase = getSupabase()
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
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('event_id', eventId)
      .eq('matched_user_id', user.id)
      .limit(1)

    if (error) {
      console.error('Error checking registration status:', error)
      return false
    }

    return (data && data.length > 0)
  },

  /**
   * 檢查使用者是否已完成活動簽到
   */
  async checkCheckinStatus(eventId: string): Promise<boolean> {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('checkin_records')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .limit(1)

    if (error) {
      console.error('Error checking checkin status:', error)
      return false
    }

    return (data && data.length > 0)
  },

  /**
   * 檢查使用者是否已提交活動回饋表單
   */
  async checkFeedbackStatus(eventId: string): Promise<boolean> {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('event_feedback_responses')
      .select('id')
      .eq('event_id', eventId)
      .eq('matched_user_id', user.id)
      .limit(1)

    if (error) {
      console.error('Error checking feedback status:', error)
      return false
    }

    return Boolean(data && data.length > 0)
  },

  /**
   * 檢查使用者是否已提交活動打卡表單
   */
  async checkCheckinFormStatus(eventId: string): Promise<boolean> {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('event_checkin_responses')
      .select('id')
      .eq('event_id', eventId)
      .eq('matched_user_id', user.id)
      .limit(1)

    if (error) {
      console.error('Error checking checkin form status:', error)
      return false
    }

    return Boolean(data && data.length > 0)
  },

}
