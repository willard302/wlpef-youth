import type { RaffleCandidate, RaffleEvent, RafflePrizeSetting, RaffleWinnerRow } from '~/types'
import { normalizeRafflePrizeSettings } from '~/utils/raffle'

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

  // 合格名單（admin only RPC）
  async fetchCandidates(eventId: string): Promise<RaffleCandidate[]> {
    const { data, error } = await getSupabase().rpc('get_raffle_candidates', { p_event_id: eventId })
    if (error) throw error
    return (data ?? []) as RaffleCandidate[]
  },

  async fetchCandidateCount(eventId: string): Promise<number> {
    const candidates = await this.fetchCandidates(eventId)
    return candidates.length
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

    const { data, error } = await supabase.rpc('set_raffle_prizes', {
      p_event_id: eventId,
      p_prizes: prizes,
    })

    if (error) throw error

    return normalizeRafflePrizeSettings(data ?? [])
  },

  // 開始抽獎：先把其他場關掉，確保同時只有一場 raffle_active=true
  async startRaffle(eventId: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.rpc('set_raffle_active', {
      p_event_id: eventId,
      p_active: true,
    })
    if (error) throw error
  },

  async stopRaffle(eventId: string): Promise<void> {
    const { error } = await getSupabase().rpc('set_raffle_active', {
      p_event_id: eventId,
      p_active: false,
    })
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

  // 公開某一輪的中獎者（動畫結束後呼叫，讓手機輪詢能看到）
  async revealRound(eventId: string, round: number): Promise<void> {
    const { error } = await getSupabase()
      .from('raffle_winners')
      .update({ revealed_at: new Date().toISOString() })
      .eq('event_id', eventId)
      .eq('round', round)
      .is('revealed_at', null)
    if (error) throw error
  },

  // 公開該活動所有尚未揭露的中獎者（關閉抽獎介面時的安全措施）
  async revealAllPending(eventId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('raffle_winners')
      .update({ revealed_at: new Date().toISOString() })
      .eq('event_id', eventId)
      .is('revealed_at', null)
    if (error) throw error
  },
}
