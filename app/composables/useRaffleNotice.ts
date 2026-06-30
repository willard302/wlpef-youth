import { POLL_INTERVAL_MS } from '~/config/raffle'
import type { UseRaffleNoticeOptions, ActiveRaffleResponse } from '~/types'

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

  let timer: ReturnType<typeof setInterval> | null = null

  const myId = computed(() => user.value?.sub ?? null)

  // 已通知過的輪次存 localStorage（依 event + 使用者），refresh 後也不再重複跳窗
  function notifiedKey(eventId: string) {
    return `raffle:notified:${eventId}:${myId.value ?? 'anon'}`
  }
  function getNotified(eventId: string): Set<number> {
    try {
      const raw = localStorage.getItem(notifiedKey(eventId))
      return new Set(raw ? (JSON.parse(raw) as number[]) : [])
    }
    catch {
      return new Set()
    }
  }
  function addNotified(eventId: string, rounds: number[]) {
    try {
      const set = getNotified(eventId)
      rounds.forEach(r => set.add(r))
      localStorage.setItem(notifiedKey(eventId), JSON.stringify([...set]))
    }
    catch {
      // localStorage 不可用時略過（最多退回每次都跳，不致出錯）
    }
  }

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

      const eventId = data.eventId
      if (eventId) {
        const notified = getNotified(eventId)
        const fresh = myWinningRounds.value.filter(r => !notified.has(r))
        if (fresh.length) {
          addNotified(eventId, fresh)
          options?.onWin?.(fresh)
        }
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
