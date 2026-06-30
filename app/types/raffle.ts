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

export interface UseRaffleNoticeOptions {
  /** 偵測到「本帳號」在新輪次中獎時呼叫，帶入尚未通知過的輪次 */
  onWin?: (rounds: number[]) => void
  /** 是否在 mount 時自動開始輪詢（預設 true）。gated 模式下傳 false，由外層控制 start/stop */
  auto?: boolean
}