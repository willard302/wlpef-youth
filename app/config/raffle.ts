import type { RaffleNotifyStyle } from '~/types'

// 中獎通知呈現方式（全域預設）：
//  - 'dialog'：vant showDialog 程式化快顯（全站可用、免掛版型）
//  - 'modal' ：自訂玻璃卡彈窗（RaffleWinModal，需掛在 default layout 才能全域顯示）
// 個別呼叫端可用 useRaffleNotice({ notifyStyle }) 覆寫。
export const RAFFLE_NOTIFY_STYLE: RaffleNotifyStyle = 'dialog'

// 手機輪詢間隔
export const POLL_INTERVAL_MS = 3000
// 雙層 gating 第一層：活動 start_at 前 / end_at 後的寬裕分鐘數，
// 落在此時間窗外則完全不輪詢（守住 Vercel 免費流量）。
export const GATING_BUFFER_MINUTES = 30
