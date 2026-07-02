import type { RaffleEvent, RafflePrizeSetting, RaffleWinnerRow } from '~/types'
import { normalizeRafflePrizeSettings } from '~/utils/raffle'

// 抽獎控制台資料層。raffle_winners / draw_raffle / get_raffle_candidates 尚未進
// generated types，故對這些呼叫以 any 取用（套 migration 後重產 database.types.ts 可移除）。



// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSupabase = () => useSupabaseClient() as any

export const raffleAdminService = {
  // 活動清單（精簡欄位，含 raffle_active；不經 Event mapper）
  async fetchEvents(): Promise<RaffleEvent[]> {
    const { data, error } = await getSupabase()
      .from('events')
      .select('id, title, status, raffle_threshold, raffle_prizes, raffle_active, start_at, end_at')
      .order('start_at', { ascending: false })
    if (error) throw error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      raffleThreshold: r.raffle_threshold ?? 0,
      rafflePrizes: normalizeRafflePrizeSettings(r.raffle_prizes ?? []),
      raffleActive: !!r.raffle_active,
      startAt: r.start_at,
      endAt: r.end_at,
    }))
  },

  // 合格人數（admin only RPC）
  async fetchCandidateCount(eventId: string): Promise<number> {
    const { data, error } = await getSupabase().rpc('get_raffle_candidates', { p_event_id: eventId })
    if (error) throw error
    return (data ?? []).length
  },

  async fetchRafflePrizes(eventId: string): Promise<RafflePrizeSetting[]> {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('events')
      .select('raffle_prizes')
      .maybeSingle()
      .eq('id', eventId)

    if (error) throw error

    return normalizeRafflePrizeSettings(data?.raffle_prizes ?? [])
  },

  async updateRafflePrizes(eventId: string, prizes: RafflePrizeSetting[]): Promise<RafflePrizeSetting[]> {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('events')
      .update({ raffle_prizes: prizes })
      .select('raffle_prizes')
      .maybeSingle()
      .eq('id', eventId)

    if (error) throw error

    return normalizeRafflePrizeSettings(data?.raffle_prizes ?? [])
  },

  // 開始抽獎：先把其他場關掉，確保同時只有一場 raffle_active=true
  async startRaffle(eventId: string): Promise<void> {
    const supabase = getSupabase()
    const { error: e1 } = await supabase.from('events').update({ raffle_active: false }).eq('raffle_active', true)
    if (e1) throw e1
    const { error: e2 } = await supabase.from('events').update({ raffle_active: true }).eq('id', eventId)
    if (e2) throw e2
  },

  async stopRaffle(eventId: string): Promise<void> {
    const { error } = await getSupabase().from('events').update({ raffle_active: false }).eq('id', eventId)
    if (error) throw error
  },

  // 抽一輪（round 由 DB 自動 +1），回傳本輪中獎者
  async drawRound(eventId: string, count: number): Promise<RaffleWinnerRow[]> {
    const { data, error } = await getSupabase().rpc('draw_raffle', { p_event_id: eventId, p_count: count })
    if (error) throw error
    return (data ?? []) as RaffleWinnerRow[]
  },

  async fetchWinners(eventId: string): Promise<RaffleWinnerRow[]> {
    const { data, error } = await getSupabase()
      .from('raffle_winners')
      .select('*')
      .eq('event_id', eventId)
      .order('round', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as RaffleWinnerRow[]
  },

  // 撤回某一輪
  async revokeRound(eventId: string, round: number): Promise<void> {
    const { error } = await getSupabase()
      .from('raffle_winners')
      .delete()
      .eq('event_id', eventId)
      .eq('round', round)
    if (error) throw error
  },
}
