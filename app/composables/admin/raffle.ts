import { raffleAdminService, type RaffleEvent, type RaffleWinnerRow } from '~/services/raffleAdmin'
import { GATING_BUFFER_MINUTES } from '~/config/raffle'

export const useAdminRaffle = () => {
  const { addToast } = useToast()

  const selectedEventId = ref<string | null>(null)
  const selectedEvent = ref<RaffleEvent | null>(null)
  const selectedDrawItem = ref<string>('1')

  const candidateCount = ref<number | null>(null)
  const winners = ref<RaffleWinnerRow[]>([])
  const drawCount = ref(1) // stepper 草稿值
  const confirmedCount = ref(1) // 已套用、實際抽獎用的位數
  const loading = ref(false)
  const drawing = ref(false)

  const isActive = computed(() => !!selectedEvent.value?.raffleActive)
  // 草稿值與已套用值不同 → 提示尚未套用
  const countDirty = computed(() => clampCount(drawCount.value) !== confirmedCount.value)

  // 選中活動「現在」是否落在時間窗 [start-buffer, end+buffer] 內（給開始抽獎防呆用）
  const withinWindow = computed(() => {
    const e = selectedEvent.value
    if (!e?.startAt || !e?.endAt) return true // 無時間資訊就不擋
    const buffer = GATING_BUFFER_MINUTES * 60 * 1000
    const now = Date.now()
    return now >= new Date(e.startAt).getTime() - buffer && now <= new Date(e.endAt).getTime() + buffer
  })

  const totalDrawn = computed(() => winners.value.length)
  const currentRound = computed(() => winners.value.reduce((m, w) => Math.max(m, w.round), 0))

  const winnersByRound = computed(() => {
    const map = new Map<number, RaffleWinnerRow[]>()
    for (const w of winners.value) {
      const arr = map.get(w.round) ?? []
      arr.push(w)
      map.set(w.round, arr)
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, items]) => ({ round, items }))
  })

  const clampCount = (v: number) => {
    return Math.max(1, Math.min(100, Math.floor(v || 1)))
  }

  const applyCount = () => {
    const v = clampCount(drawCount.value)
    drawCount.value = v
    confirmedCount.value = v
    addToast(`已設定每輪 ${v} 位`, 'success')
  }

  const refreshSelected = async() => {
    if (!selectedEventId.value) return
    const [count, wins] = await Promise.all([
      raffleAdminService.fetchCandidateCount(selectedEventId.value).catch(() => null),
      raffleAdminService.fetchWinners(selectedEventId.value),
    ])
    candidateCount.value = count
    winners.value = wins
  }

  const onSelectEvent = async(event: any) => {
    selectedEvent.value = event
    selectedEventId.value = event?.id ?? null
    candidateCount.value = null
    winners.value = []
    if (selectedEventId.value) await refreshSelected()
  }

  const start = async() => {
    if (!selectedEventId.value) return
    try {
      await raffleAdminService.startRaffle(selectedEventId.value)
      if (selectedEvent.value) {
        selectedEvent.value.raffleActive = true
      }
      addToast('已開始抽獎', 'success')
    }
    catch {
      addToast('開始抽獎失敗', 'error')
    }
  }

  const stop = async() => {
    if (!selectedEventId.value) return
    try {
      await raffleAdminService.stopRaffle(selectedEventId.value)
      if (selectedEvent.value) {
        selectedEvent.value.raffleActive = false
      }
      addToast('已結束抽獎', 'success')
    }
    catch {
      addToast('結束抽獎失敗', 'error')
    }
  }

  const drawOne = async() => {
    if (!selectedEventId.value || drawing.value) return
    const count = confirmedCount.value // 用「已套用」的位數
    drawing.value = true
    try {
      const fresh = await raffleAdminService.drawRound(selectedEventId.value, count)
      if (!fresh.length) {
        addToast('沒有可抽的合格者了', 'info')
      }
      else {
        winners.value = [...winners.value, ...fresh]
        addToast(`第 ${fresh[0]!.round} 輪抽出 ${fresh.length} 位`, 'success')
      }
    }
    catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '抽獎失敗', 'error')
    }
    finally {
      drawing.value = false
    }
  }

  const revoke = async(round: number) => {
    if (!selectedEventId.value) return
    try {
      await raffleAdminService.revokeRound(selectedEventId.value, round)
      winners.value = winners.value.filter(w => w.round !== round)
      addToast(`已撤回第 ${round} 輪`, 'success')
    }
    catch {
      addToast('撤回失敗', 'error')
    }
  }

  return {
    selectedEventId,
    selectedEvent,
    selectedDrawItem,
    candidateCount,
    winners,
    winnersByRound,
    drawCount,
    confirmedCount,
    countDirty,
    withinWindow,
    isActive,
    loading,
    drawing,
    totalDrawn,
    currentRound,
    onSelectEvent,
    applyCount,
    start,
    stop,
    drawOne,
    revoke,
  }
}
