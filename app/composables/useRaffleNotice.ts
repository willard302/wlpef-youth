import { POLL_INTERVAL_MS } from '~/config/raffle'

export interface RaffleWinner {
  userId: string
  name: string | null
  round: number
}

export interface ActiveRaffleResponse {
  active: boolean
  eventId?: string
  round?: number
  winners?: RaffleWinner[]
}

interface UseRaffleNoticeOptions {
  /** 偵測到「本帳號」在新輪次中獎時呼叫，帶入尚未通知過的輪次 */
  onWin?: (rounds: number[]) => void
  /** 是否在 mount 時自動開始輪詢（預設 true）。gated 模式下傳 false，由外層控制 start/stop */
  auto?: boolean
}

/**
 * 最小中獎通知機制：每 POLL_INTERVAL_MS 輪詢 /api/lottery/active，
 * 比對目前登入者 id 是否在 winners 內，命中（且該輪尚未通知過）就觸發 onWin。
 * 不做雙層 gating（時間窗）優化，純驗證資料管線 → 畫面。
 */
export function useRaffleNotice(options?: UseRaffleNoticeOptions) {
  const user = useSupabaseUser()

  const active = ref(false)
  const currentRound = ref(0)
  const myWinningRounds = ref<number[]>([])
  const lastError = ref<string | null>(null)
  const polling = ref(false)
  const lastResponse = ref<ActiveRaffleResponse | null>(null)

  // 已通知過的輪次，避免每次輪詢都重複跳窗
  const notifiedRounds = new Set<number>()
  let timer: ReturnType<typeof setInterval> | null = null

  const myId = computed(() => user.value?.sub ?? null)

  async function poll() {
    try {
      const data = await $fetch<ActiveRaffleResponse>('/api/lottery/active')
      lastResponse.value = data
      lastError.value = null
      active.value = !!data.active
      currentRound.value = data.round ?? 0

      if (!data.active || !myId.value) {
        myWinningRounds.value = []
        return
      }

      const mine = (data.winners ?? []).filter(w => w.userId === myId.value)
      myWinningRounds.value = mine.map(w => w.round).sort((a, b) => a - b)

      const fresh = myWinningRounds.value.filter(r => !notifiedRounds.has(r))
      if (fresh.length) {
        fresh.forEach(r => notifiedRounds.add(r))
        options?.onWin?.(fresh)
      }
    }
    catch (e: unknown) {
      lastError.value = e instanceof Error ? e.message : 'poll failed'
    }
  }

  function start() {
    if (polling.value) return
    polling.value = true
    void poll()
    timer = setInterval(() => void poll(), POLL_INTERVAL_MS)
  }

  function stop() {
    polling.value = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  if (options?.auto !== false) onMounted(start)
  onBeforeUnmount(stop)

  return {
    active,
    currentRound,
    myWinningRounds,
    lastError,
    polling,
    lastResponse,
    myId,
    start,
    stop,
    poll,
  }
}
