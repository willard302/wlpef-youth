// 手機輪詢間隔
export const POLL_INTERVAL_MS = 3000
// 雙層 gating 第一層：活動 start_at 前 / end_at 後的寬裕分鐘數，
// 落在此時間窗外則完全不輪詢（守住 Vercel 免費流量）。
export const GATING_BUFFER_MINUTES = 30
