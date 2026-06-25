import { raffleAdminService, type RaffleEvent, type RaffleWinnerRow } from '~/services/raffleAdmin'

export function useAdminRaffle() {
  const { addToast } = useToast()

  const events = ref<RaffleEvent[]>([])
  const selectedEventId = ref<string | null>(null)
  const candidateCount = ref<number | null>(null)
  const winners = ref<RaffleWinnerRow[]>([])
  const drawCount = ref(1)
  const loading = ref(false)
  const drawing = ref(false)

  const selectedEvent = computed(() => events.value.find(e => e.id === selectedEventId.value) ?? null)
  const isActive = computed(() => !!selectedEvent.value?.raffleActive)
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

  async function refreshSelected() {
    if (!selectedEventId.value) return
    const [count, wins] = await Promise.all([
      raffleAdminService.fetchCandidateCount(selectedEventId.value).catch(() => null),
      raffleAdminService.fetchWinners(selectedEventId.value),
    ])
    candidateCount.value = count
    winners.value = wins
  }

  async function loadEvents() {
    loading.value = true
    try {
      events.value = await raffleAdminService.fetchEvents()
      const active = events.value.find(e => e.raffleActive)
      selectedEventId.value = active?.id ?? events.value[0]?.id ?? null
      if (selectedEventId.value) await refreshSelected()
    }
    catch {
      addToast('載入活動失敗', 'error')
    }
    finally {
      loading.value = false
    }
  }

  async function onSelectEvent(id: string) {
    selectedEventId.value = id
    candidateCount.value = null
    winners.value = []
    await refreshSelected()
  }

  async function start() {
    if (!selectedEventId.value) return
    try {
      await raffleAdminService.startRaffle(selectedEventId.value)
      const id = selectedEventId.value
      events.value = events.value.map(e => ({ ...e, raffleActive: e.id === id }))
      addToast('已開始抽獎', 'success')
    }
    catch {
      addToast('開始抽獎失敗', 'error')
    }
  }

  async function stop() {
    if (!selectedEventId.value) return
    try {
      await raffleAdminService.stopRaffle(selectedEventId.value)
      const id = selectedEventId.value
      events.value = events.value.map(e => (e.id === id ? { ...e, raffleActive: false } : e))
      addToast('已結束抽獎', 'success')
    }
    catch {
      addToast('結束抽獎失敗', 'error')
    }
  }

  async function drawOne() {
    if (!selectedEventId.value || drawing.value) return
    const count = Math.max(1, Math.min(100, Math.floor(drawCount.value || 1)))
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

  async function revoke(round: number) {
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
    events,
    selectedEventId,
    selectedEvent,
    candidateCount,
    winners,
    winnersByRound,
    drawCount,
    isActive,
    loading,
    drawing,
    totalDrawn,
    currentRound,
    loadEvents,
    onSelectEvent,
    start,
    stop,
    drawOne,
    revoke,
  }
}
