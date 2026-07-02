import { POLL_INTERVAL_MS } from '~/config/raffle'
import type { UseRaffleNoticeOptions, ActiveRaffleResponse, RaffleWinDisplay } from '~/types'

/**
 * 最小中獎通知機制：每 POLL_INTERVAL_MS 輪詢 /api/lottery/active，
 * 比對目前登入者 id 是否在 winners 內，命中（且該輪尚未通知過）就觸發 onWin。
 * 不做雙層 gating（時間窗）優化，純驗證資料管線 → 畫面。
 */
export const useRaffleNotice = (options?: UseRaffleNoticeOptions) => {
  const user = useSupabaseUser()

  const isRefreshing = ref(false)
  const active = ref(false)
  const polling = ref(false)
  const showWinModal = ref(false)
  const countdown = ref('--:--:--')
  const myWinningRounds = ref<number[]>([])
  const myWinningPrizes = ref<RaffleWinDisplay[]>([])
  const lastError = ref<string | null>(null)
  const lastResponse = ref<ActiveRaffleResponse | null>(null)

  let timer: ReturnType<typeof setInterval> | null = null

  const myId = computed(() => user.value?.email ?? null)

  const statusLabel = computed(() => {
    if (!polling.value) return '未開始'
    if (active.value) return '進行中'
    return '準備中'
  })
  const statusDotClass = computed(() => {
    if (active.value) return 'bg-emerald-400'
    if (polling.value) return 'bg-amber-400'
    return 'bg-slate-400'
  })
  const memberDisplay = computed(() => {
    const id = myId.value
    if (!id) return '------'
    const account = id.split('@')[0]
    return `#${account?.toUpperCase()}`
  })

  // 已通知過的輪次存 localStorage（依 event + 使用者），refresh 後也不再重複跳窗
  const notifiedKey = (eventId: string) => {
    return `raffle:notified:${eventId}:${myId.value ?? 'anon'}`
  }
  const getNotified = (eventId: string): Set<number> => {
    try {
      const raw = localStorage.getItem(notifiedKey(eventId))
      return new Set(raw ? (JSON.parse(raw) as number[]) : [])
    }
    catch {
      return new Set()
    }
  }
  const addNotified = (eventId: string, rounds: number[]) => {
    try {
      const set = getNotified(eventId)
      rounds.forEach(r => set.add(r))
      localStorage.setItem(notifiedKey(eventId), JSON.stringify([...set]))
    }
    catch {
      // localStorage 不可用時略過（最多退回每次都跳，不致出錯）
    }
  }
  const poll = async() => {
    try {
      const data = await $fetch<ActiveRaffleResponse>('/api/lottery/active')
      lastResponse.value = data
      lastError.value = null
      active.value = !!data.active

      if (!data.active || !myId.value) {
        myWinningRounds.value = []
        myWinningPrizes.value = []
        return
      }

      const mine = (data.winners ?? []).filter(w => w.userId === myId.value)
      myWinningRounds.value = mine.map(w => w.round).sort((a, b) => a - b)

      const eventId = data.eventId
      if (eventId) {
        const notified = getNotified(eventId)
        const fresh = myWinningPrizes.value.filter(w => !notified.has(w.round))
        if (fresh.length) {
          addNotified(eventId, fresh.map(w => w.round))
          options?.onWin?.(fresh)
        }
      }
    }
    catch (e: unknown) {
      lastError.value = e instanceof Error ? e.message : 'poll failed'
    }
  }
  const handleRefresh = async() => {
    if (isRefreshing.value) return
    isRefreshing.value = true
    await poll()
    setTimeout(() => {
      isRefreshing.value = false
    }, 800)
  }
  const updateCountdown = () => {
    const now = new Date()
    const next = new Date(now)
    next.setHours(next.getHours() + 1, 0, 0, 0)
    const diff = Math.max(0, next.getTime() - now.getTime())
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    countdown.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  const closeWinModal = () => {
    showWinModal.value = false
  }
  const start = () => {
    if (polling.value) return
    polling.value = true
    void poll()
    timer = setInterval(() => void poll(), POLL_INTERVAL_MS)
  }
  const stop = () => {
    polling.value = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  if (options?.auto !== false) onMounted(start)
  onBeforeUnmount(stop)

  return {
    countdown,
    isRefreshing,
    active,
    myWinningRounds,
    myWinningPrizes,
    lastError,
    polling,
    lastResponse,
    myId,
    statusLabel,
    statusDotClass,
    memberDisplay,
    showWinModal,
    start,
    stop,
    poll,
    closeWinModal,
    handleRefresh,
    updateCountdown,
  }
}
