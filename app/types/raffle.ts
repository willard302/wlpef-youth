export interface RaffleWinner {
  userId: string
  name: string | null
  round: number
  prize?: string | null
}

export interface RaffleWinDisplay {
  round: number
  label: string
}

export interface ActiveRaffleResponse {
  active: boolean
  eventId?: string
  round?: number
  winners?: RaffleWinner[]
}

export interface UseRaffleNoticeOptions {
  /** 偵測到「本帳號」在新輪次中獎時呼叫，帶入尚未通知過的獎項資訊 */
  onWin?: (wins: RaffleWinDisplay[]) => void
  /** 是否在 mount 時自動開始輪詢（預設 true）。gated 模式下傳 false，由外層控制 start/stop */
  auto?: boolean
}

export interface RafflePrizeSetting {
  prize: string
  name: string
  count: number
  drawOrder: number
}

export interface RaffleEvent {
  id: string
  title: string
  status: string
  raffleThreshold: number
  rafflePrizes: RafflePrizeSetting[]
  raffleActive: boolean
  startAt: string
  endAt: string
}

export interface RaffleWinnerRow {
  id: string
  event_id: string
  user_id: string
  round: number
  name: string | null
  points: number | null
  created_at: string
}

export interface DrawStageEvent {
  id: string
  title: string
}