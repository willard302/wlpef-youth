
import type { Event, EventStatus } from '~/types'
import type { Database } from '~/types/database.types'

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

}
