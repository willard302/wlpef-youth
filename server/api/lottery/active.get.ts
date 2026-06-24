import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // 先設快取標頭：對所有人回應一致，才能被 Vercel CDN 快取
  setHeader(
    event,
    'Cache-Control',
    `public, s-maxage=${RAFFLE_SMAXAGE_SECONDS}, stale-while-revalidate=${RAFFLE_SWR_SECONDS}`,
  )

  // service-role client：不持久化 session、不帶 cookie → 回應非個人化、可快取。
  // 缺金鑰時 serverSupabaseServiceRole 會丟錯 → Nitro 回 500，不洩漏細節。
  // <any>：raffle_winners / events.raffle_active 尚未進 generated types，套用 migration 後
  // 重新產生 ~/types/database.types.ts 即可移除。
  const supabase = serverSupabaseServiceRole<any>(event)

  const { data: activeEvent, error: evErr } = await supabase
    .from('events')
    .select('id')
    .eq('raffle_active', true)
    .limit(1)
    .maybeSingle()

  if (evErr) throw createError({ statusCode: 500, statusMessage: 'event lookup failed' })
  if (!activeEvent) return { active: false as const }

  const { data: winners, error: wErr } = await supabase
    .from('raffle_winners')
    .select('user_id, name, round')
    .eq('event_id', activeEvent.id)
    .order('round', { ascending: true })

  if (wErr) throw createError({ statusCode: 500, statusMessage: 'winners lookup failed' })

  const rows = (winners ?? []) as { user_id: string, name: string | null, round: number }[]
  const latestRound = rows.reduce((m, w) => Math.max(m, w.round), 0)

  return {
    active: true as const,
    eventId: activeEvent.id as string,
    round: latestRound,
    winners: rows.map(w => ({ userId: w.user_id, name: w.name, round: w.round })),
  }
})
