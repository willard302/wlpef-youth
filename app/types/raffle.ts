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

/** 中獎通知呈現方式：'dialog' = vant showDialog 快顯；'modal' = 自訂玻璃卡彈窗 */
export type RaffleNotifyStyle = 'dialog' | 'modal'

export interface UseRaffleNoticeOptions {
  /** 偵測到「本帳號」在新輪次中獎時呼叫，帶入尚未通知過的獎項資訊（內建通知外的額外行為） */
  onWin?: (wins: RaffleWinDisplay[]) => void
  /** 是否在 mount 時自動開始輪詢（預設 true）。gated 模式下傳 false，由外層控制 start/stop */
  auto?: boolean
  /** 中獎通知呈現方式；未指定則採用 config 的 RAFFLE_NOTIFY_STYLE */
  notifyStyle?: RaffleNotifyStyle
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

export interface RaffleCandidate {
  id: string
  name: string | null
}

export interface DrawStageEvent {
  id: string
  title: string
}

export interface PrizeFormPayload {
  prize: string
  name: string
  count: number
  drawOrder: number
}

export interface PrizeFormMode {
  mode?: 'create' | 'edit'
  initialPrize?: Partial<PrizeFormPayload> | null
}
