import { GATING_BUFFER_MINUTES } from '~/config/raffle'

/**
 * 全域中獎通知（掛在會員版型 default layout）。
 * 雙層 gating：
 *  - 第一層（本地、零成本）：只有「現在」落在某 published 活動的
 *    [start_at − buffer, end_at + buffer] 時間窗內，才啟動輪詢；窗外完全不打。
 *  - 第二層（後端）：/api/lottery/active 的 raffle_active 決定是否真的跳通知。
 */
export function useRaffleNotifier() {
  const user = useSupabaseUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = useSupabaseClient() as any

  // 通知呈現（dialog / modal）由 useRaffleNotice 依 config（RAFFLE_NOTIFY_STYLE）統一處理；
  // 這裡只負責第一層 gating（時間窗）與 start/stop。
  const notice = useRaffleNotice({ auto: false })

  const BUFFER_MS = GATING_BUFFER_MINUTES * 60 * 1000
  const windows = ref<{ start: number, end: number }[]>([])
  let supervisor: ReturnType<typeof setInterval> | null = null
  let refetch: ReturnType<typeof setInterval> | null = null

  async function loadWindows() {
    const sinceIso = new Date(Date.now() - BUFFER_MS).toISOString()
    const { data, error } = await supabase
      .from('events')
      .select('start_at, end_at')
      .eq('status', 'published')
      .gte('end_at', sinceIso) // 排除早已結束的活動
    if (error) return
    windows.value = (data ?? []).map((e: { start_at: string, end_at: string }) => ({
      start: new Date(e.start_at).getTime() - BUFFER_MS,
      end: new Date(e.end_at).getTime() + BUFFER_MS,
    }))
  }

  function withinWindow() {
    const now = Date.now()
    return windows.value.some(w => now >= w.start && now <= w.end)
  }

  // 第一層 gating：決定是否要啟動輪詢
  function evaluate() {
    if (!user.value?.sub || !withinWindow()) {
      notice.stop()
      return
    }
    notice.start()
  }

  onMounted(async () => {
    await loadWindows()
    evaluate()
    // 每 60 秒重新評估是否進出時間窗（純本地計算，不打網路）
    supervisor = setInterval(evaluate, 60_000)
    // 每 10 分鐘重抓活動時間（活動可能新增/調整）
    refetch = setInterval(async () => {
      await loadWindows()
      evaluate()
    }, 10 * 60_000)
  })

  onBeforeUnmount(() => {
    if (supervisor) clearInterval(supervisor)
    if (refetch) clearInterval(refetch)
    notice.stop()
  })

  return notice
}
