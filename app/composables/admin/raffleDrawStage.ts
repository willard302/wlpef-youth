import type { DrawStageEvent, RafflePrizeSetting, RaffleWinnerRow } from '~/types'
import { normalizeRafflePrizeSettings } from '~/utils/raffle'
import { raffleAdminService } from '~/services/raffleAdmin'

export interface AdminRaffleDrawStageProps {
  show: boolean
  event: DrawStageEvent | null
  candidateCount: number | null
  candidateNames: string[]
  winners: RaffleWinnerRow[]
  prizeRows: RafflePrizeSetting[]
  prizeDirty: boolean
  withinWindow: boolean
  isActive: boolean
  loading: boolean
  drawing: boolean
  onStart: () => Promise<void>
  onStop: () => Promise<void>
  onDrawOne: () => Promise<boolean>
}

export type AdminRaffleDrawStageEmit = {
  (e: 'update:show', value: boolean): void
}

const getWinnerName = (winner: RaffleWinnerRow) => winner.name || winner.user_id
const MIN_ROLLING_MS = 5000

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const maskName = (name: string) => {
  if (!name) return ''
  if (name.length <= 2) return `${name.substring(0, 1)}○`
  return `${name.substring(0, 1)}○${name.substring(2)}`
}

const formatPrizeLabel = (prize: RafflePrizeSetting) => {
  return prize.name || '未命名獎項'
}

export const useAdminRaffleDrawStage = (
  props: Readonly<AdminRaffleDrawStageProps>,
  emit: AdminRaffleDrawStageEmit
) => {
  const nameList = ref<string[]>([])
  const currentIndex = ref(0)
  const isRolling = ref(false)
  const showWinnerPopup = ref(false)
  const latestWinners = ref<RaffleWinnerRow[]>([])
  const drawStartWinnerCount = ref(0)
  const rollingStartedAt = ref(0)

  const showModel = computed({
    get: () => props.show,
    set: (value: boolean) => emit('update:show', value),
  })

  const orderedPrizeRows = computed(() => normalizeRafflePrizeSettings(props.prizeRows))

  const nextRound = computed(() => props.winners.reduce((max, winner) => Math.max(max, winner.round), 0) + 1)

  const currentPrize = computed(() => {
    return orderedPrizeRows.value[nextRound.value - 1] ?? null
  })

  const currentPrizeLabel = computed(() => {
    if (!props.event) return '尚未選擇活動'
    if (!orderedPrizeRows.value.length) return '尚未設定獎項'
    if (!currentPrize.value) return nextRound.value > orderedPrizeRows.value.length ? '已抽完所有獎項' : '未設定獎項'
    return `${currentPrize.value.prize}：${formatPrizeLabel(currentPrize.value)}`
  })

  const winnersByRound = computed(() => {
    const map = new Map<number, RaffleWinnerRow[]>()
    for (const winner of props.winners) {
      const items = map.get(winner.round) ?? []
      items.push(winner)
      map.set(winner.round, items)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  })

  const getRoundPrizeLabel = (round: number) => {
    const prize = orderedPrizeRows.value.find(row => row.drawOrder === round) ?? orderedPrizeRows.value[round - 1]
    return prize ? formatPrizeLabel(prize) : `第 ${round} 輪`
  }

  const winnerNames = computed(() => {
    return new Set(latestWinners.value.map(getWinnerName).filter(Boolean))
  })

  const fallbackNames = computed(() => {
    const seen = new Set<string>()
    return props.candidateNames
      .map(name => `${name}`.trim())
      .filter((name) => {
        if (!name || seen.has(name)) return false
        seen.add(name)
        return true
      })
  })

  const displayName = (name: string) => {
    return winnerNames.value.has(name) ? name : maskName(name)
  }

  const statusLabel = computed(() => {
    if (props.isActive) return '抽獎進行中'
    if (props.event) return '等待開始'
    return '尚未選擇活動'
  })

  const statusTone = computed(() => {
    if (props.isActive) return 'bg-emerald-100 text-emerald-700'
    if (props.event) return 'bg-amber-100 text-amber-700'
    return 'bg-slate-100 text-slate-500'
  })

  const canDrawCurrentPrize = computed(() => {
    return !!props.event && !!currentPrize.value && !props.prizeDirty && !props.loading && !props.drawing
  })

  const canStopRaffle = computed(() => {
    return props.isActive && !props.loading && !props.drawing
  })

  const primaryActionText = computed(() => {
    if (isRolling.value) return '停止'
    return props.isActive ? '抽下一輪' : '開始抽獎'
  })

  const handleStart = async() => {
    if (props.isActive) return true
    if (!props.withinWindow) {
      try {
        await showConfirmDialog({
          title: '不在活動時段',
          message: '現在不在此活動的時間窗內（活動前 30 分 ~ 結束後 30 分），一般使用者的頁面不會輪詢、收不到中獎通知。仍要開始抽獎嗎？',
          confirmButtonText: '仍要開始',
          confirmButtonColor: '#f59e0b',
        })
      }
      catch {
        return false
      }
    }

    await props.onStart()
    await nextTick()
    return props.isActive
  }

  const handlePrimaryAction = async() => {
    if (isRolling.value) {
      isRolling.value = false
      return
    }

    if (props.prizeDirty || props.loading || props.drawing || !currentPrize.value) return

    const started = props.isActive || await handleStart()
    if (!started) return

    rollingStartedAt.value = Date.now()
    isRolling.value = true
    const drewWinner = await props.onDrawOne()
    if (!drewWinner && !props.drawing) isRolling.value = false
  }

  const handleStop = async() => {
    if (!canStopRaffle.value) return

    try {
      await showConfirmDialog({
        title: '結束抽獎',
        message: '結束後一般使用者將不再收到此活動的抽獎通知。確定要結束嗎？',
        confirmButtonText: '結束抽獎',
        confirmButtonColor: '#ef4444',
      })
    }
    catch {
      return
    }

    isRolling.value = false
    await props.onStop()
  }

  const handleClose = () => {
    // 安全措施：若管理員在動畫期間關閉，確保所有尚未公開的中獎者仍會被揭露
    const eventId = props.event?.id
    if (eventId) {
      void raffleAdminService.revealAllPending(eventId).catch(() => {})
    }
    showModel.value = false
  }

  const revealWinners = (winners: RaffleWinnerRow[]) => {
    isRolling.value = false
    if (!winners.length) return

    // 動畫結束，立即公開這一輪中獎者，讓手機輪詢能看到
    const eventId = props.event?.id
    const round = winners[0]?.round
    if (eventId && round != null) {
      void raffleAdminService.revealRound(eventId, round).catch(() => {
        // 靜默失敗：最壞情況是手機晚幾輪才看到，不影響大螢幕展示
      })
    }

    latestWinners.value = winners

    const firstWinnerName = winners[0] ? getWinnerName(winners[0]) : ''
    if (firstWinnerName) {
      const existingIndex = nameList.value.findIndex(name => name === firstWinnerName)
      if (existingIndex === -1) {
        nameList.value.unshift(firstWinnerName)
        currentIndex.value = 0
      }
      else {
        currentIndex.value = existingIndex
      }
    }

    showWinnerPopup.value = true
  }

  watch(
    fallbackNames,
    (names) => {
      const winningNames = props.winners.map(getWinnerName).filter(Boolean)
      const merged = [...names]
      for (const name of winningNames) {
        if (!merged.includes(name)) merged.unshift(name)
      }

      nameList.value = merged
      if (currentIndex.value >= nameList.value.length) currentIndex.value = 0
    },
    { immediate: true }
  )

  watch(
    () => props.drawing,
    (isDrawing, wasDrawing) => {
      if (isDrawing) {
        drawStartWinnerCount.value = props.winners.length
        rollingStartedAt.value = Date.now()
        isRolling.value = true
        return
      }

      if (!wasDrawing) return
      const appended = props.winners.slice(drawStartWinnerCount.value)
      const remainingMs = Math.max(0, MIN_ROLLING_MS - (Date.now() - rollingStartedAt.value))
      if (remainingMs > 0) {
        wait(remainingMs).then(() => revealWinners(appended))
        return
      }

      revealWinners(appended)
    }
  )

  return {
    nameList,
    currentIndex,
    isRolling,
    showWinnerPopup,
    latestWinners,
    showModel,
    orderedPrizeRows,
    nextRound,
    currentPrize,
    currentPrizeLabel,
    winnersByRound,
    getRoundPrizeLabel,
    winnerNames,
    displayName,
    statusLabel,
    statusTone,
    canDrawCurrentPrize,
    canStopRaffle,
    primaryActionText,
    handleStart,
    handlePrimaryAction,
    handleStop,
    handleClose,
    formatPrizeLabel,
  }
}
