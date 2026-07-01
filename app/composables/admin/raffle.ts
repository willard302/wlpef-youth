import type { RaffleEvent, RafflePrizeSetting, RaffleWinnerRow } from '~/types'
import { GATING_BUFFER_MINUTES } from '~/config/raffle'
import { raffleAdminService } from '~/services/raffleAdmin'
import { getRafflePrizeCountByRound, getRafflePrizeSettingByRound, normalizeRafflePrizeSettings } from '~/utils/raffle'

export const useAdminRaffle = () => {
  const { addToast } = useToast()

  const selectedEvent = ref<RaffleEvent | null>(null)
  const prizeDraft = ref<RafflePrizeSetting[]>([])
  const candidateCount = ref<number | null>(null)
  const winners = ref<RaffleWinnerRow[]>([])
  const loading = ref(false)
  const drawing = ref(false)
  const showPrizeModal = ref(false)

  const comparablePrizeSettings = (prizes?: Array<Partial<RafflePrizeSetting> | null> | null) => {
    const rows = normalizeRafflePrizeSettings(prizes)
    if (rows.length === 1 && !rows[0]!.prize && !rows[0]!.name && rows[0]!.count === 1) return []
    return rows
  }

  const isActive = computed(() => !!selectedEvent.value?.raffleActive)

  const prizeDirty = computed(() => {
    const saved = comparablePrizeSettings(selectedEvent.value?.rafflePrizes)
    const draft = comparablePrizeSettings(prizeDraft.value)
    return JSON.stringify(saved) !== JSON.stringify(draft)
  })
  const prizeRows = computed(() => {
    const rows = normalizeRafflePrizeSettings(prizeDraft.value)
    return rows.length ? rows : [{ prize: '', name: '', count: 1, drawOrder: 1 }]
  })

  // 選中活動「現在」是否落在時間窗 [start-buffer, end+buffer] 內（給開始抽獎防呆用）
  const withinWindow = computed(() => {
    const e = selectedEvent.value
    if (!e?.startAt || !e?.endAt) return true // 無時間資訊就不擋
    const buffer = GATING_BUFFER_MINUTES * 60 * 1000
    const now = Date.now()
    return now >= new Date(e.startAt).getTime() - buffer && now <= new Date(e.endAt).getTime() + buffer
  })

  const addPrizeRow = async(prize?: Partial<RafflePrizeSetting>) => {
    if (!prize) {
      showPrizeModal.value = true
      return
    }

    const eventId = selectedEvent.value?.id
    if (!eventId) return

    const prizeName = `${prize.prize ?? ''}`.trim()
    const name = `${prize.name ?? ''}`.trim()
    const count = Number(prize.count ?? 1)
    const drawOrder = Number(prize.drawOrder ?? 1)

    if (!prizeName || !name || !Number.isFinite(count) || count < 1 || !Number.isFinite(drawOrder) || drawOrder < 1) {
      addToast('請輸入完整且正確的獎項資料', 'error')
      return
    }

    const next = [
      ...normalizeRafflePrizeSettings(prizeDraft.value),
      { prize: prizeName, name, count: Math.floor(count), drawOrder: Math.floor(drawOrder) },
    ]

    try {
      const merged = await raffleAdminService.updateRafflePrizes(eventId, next)
      if (selectedEvent.value) {
        selectedEvent.value.rafflePrizes = [...merged]
      }
      prizeDraft.value = [...merged]
      showPrizeModal.value = false
      addToast('已新增獎項', 'success')
    }
    catch {
      addToast('新增獎項失敗', 'error')
    }
  }

  const updatePrizeRow = async(index: number, prize: Partial<RafflePrizeSetting>) => {
    const eventId = selectedEvent.value?.id
    if (!eventId) return

    const prizeName = `${prize.prize ?? ''}`.trim()
    const name = `${prize.name ?? ''}`.trim()
    const count = Number(prize.count ?? 1)
    const drawOrder = Number(prize.drawOrder ?? 1)

    if (index < 0 || index >= prizeDraft.value.length) {
      addToast('找不到要編輯的獎項', 'error')
      return
    }

    if (!prizeName || !name || !Number.isFinite(count) || count < 1 || !Number.isFinite(drawOrder) || drawOrder < 1) {
      addToast('請輸入完整且正確的獎項資料', 'error')
      return
    }

    const next = [...normalizeRafflePrizeSettings(prizeDraft.value)]
    next[index] = { prize: prizeName, name, count: Math.floor(count), drawOrder: Math.floor(drawOrder) }

    try {
      const merged = await raffleAdminService.updateRafflePrizes(eventId, next)
      if (selectedEvent.value) {
        selectedEvent.value.rafflePrizes = [...merged]
      }
      prizeDraft.value = [...merged]
      showPrizeModal.value = false
      addToast('已更新獎項', 'success')
    }
    catch {
      addToast('更新獎項失敗', 'error')
    }
  }
  
  const removePrizeRow = (index: number) => {
    const eventId = selectedEvent.value?.id
    if (!eventId) return
    const next = [...normalizeRafflePrizeSettings(prizeDraft.value)]
    next.splice(index, 1)
    prizeDraft.value = next.length ? next : [{ prize: '', name: '', count: 1, drawOrder: 1 }]
    raffleAdminService.updateRafflePrizes(eventId, prizeDraft.value)
  }

  const savePrizes = async() => {
    const eventId = selectedEvent.value?.id
    if (!eventId) return
    const prizes = normalizeRafflePrizeSettings(prizeDraft.value)

    try {
      const merged = await raffleAdminService.updateRafflePrizes(eventId, prizes)
      if (selectedEvent.value) {
        selectedEvent.value.rafflePrizes = [...merged]
      }
      prizeDraft.value = [...merged]
      addToast('已儲存獎項設定', 'success')
    }
    catch {
      addToast('儲存獎項失敗', 'error')
    }
  }

  const refreshSelected = async() => {
    const eventId = selectedEvent.value?.id
    if (!eventId) return
    const [count, wins] = await Promise.all([
      raffleAdminService.fetchCandidateCount(eventId).catch(() => null),
      raffleAdminService.fetchWinners(eventId),
    ])
    candidateCount.value = count
    winners.value = wins
  }

  const onSelectEvent = async(event: any) => {
    selectedEvent.value = event
    candidateCount.value = null
    winners.value = []
    prizeDraft.value = normalizeRafflePrizeSettings(event?.rafflePrizes)
    if (!prizeDraft.value.length) prizeDraft.value = [{ prize: '', name: '', count: 1, drawOrder: 1 }]
    if (selectedEvent.value?.id) {
      await Promise.all([
        refreshSelected(),
        reloadPrizes(),
      ])
    }
  }

  const reloadPrizes = async() => {
    const eventId = selectedEvent.value?.id
    if (!eventId) return

    try {
      const prizes = await raffleAdminService.fetchRafflePrizes(eventId)
      if (selectedEvent.value) {
        selectedEvent.value.rafflePrizes = [...prizes]
      }
      prizeDraft.value = prizes.length ? [...prizes] : [{ prize: '', name: '', count: 1, drawOrder: 1 }]
    }
    catch {
      addToast('載入獎項失敗', 'error')
    }
  }

  const start = async() => {
    const eventId = selectedEvent.value?.id
    if (!eventId) return
    try {
      await raffleAdminService.startRaffle(eventId)
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
    const eventId = selectedEvent.value?.id
    if (!eventId) return
    try {
      await raffleAdminService.stopRaffle(eventId)
      if (selectedEvent.value) {
        selectedEvent.value.raffleActive = false
      }
      addToast('已結束抽獎', 'success')
    }
    catch {
      addToast('結束抽獎失敗', 'error')
    }
  }

  const drawOne = async(): Promise<boolean> => {
    const eventId = selectedEvent.value?.id
    if (!eventId || drawing.value) return false
    if (prizeDirty.value) {
      addToast('請先儲存獎項設定再抽獎', 'error')
      return false
    }

    const round = winners.value.reduce((max, winner) => Math.max(max, winner.round), 0) + 1
    const prizeSetting = getRafflePrizeSettingByRound(round, selectedEvent.value?.rafflePrizes)
    if (!prizeSetting) {
      addToast('已沒有下一個獎項可抽', 'info')
      return false
    }

    const count = getRafflePrizeCountByRound(round, selectedEvent.value?.rafflePrizes)
    drawing.value = true
    try {
      const fresh = await raffleAdminService.drawRound(eventId, count)
      if (!fresh.length) {
        addToast('沒有可抽的合格者了', 'info')
        return false
      }
      else {
        winners.value = [...winners.value, ...fresh]
        return true
      }
    }
    catch (e: unknown) {
      addToast(e instanceof Error ? e.message : '抽獎失敗', 'error')
      return false
    }
    finally {
      drawing.value = false
    }
  }

  return {
    showPrizeModal,
    selectedEvent,
    candidateCount,
    winners,
    prizeDraft,
    prizeRows,
    prizeDirty,
    withinWindow,
    isActive,
    loading,
    drawing,
    addPrizeRow,
    updatePrizeRow,
    reloadPrizes,
    onSelectEvent,
    removePrizeRow,
    savePrizes,
    start,
    stop,
    drawOne,
  }
}
