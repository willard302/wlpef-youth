// Google 表單「時間戳記」解析。純函式、無外部依賴，供 index.ts 與測試共用。
//
// Sheet 的時間戳記是「台北當地時間、不帶時區資訊」的字串（如 2026/7/10 上午 11:02:34）。
// Edge Runtime 時區為 UTC，不可用 new Date(y, m, d, ...) 或 Date.parse 直接解析無時區字串
// （會被當成 runtime 本地時間，結果隨部署環境改變）。一律以 Date.UTC 建構後扣除台北偏移。
const HOUR_MS = 60 * 60 * 1000
// 台灣時間（UTC+8，無夏令時間）
const TAIPEI_UTC_OFFSET_MS = 8 * HOUR_MS

// 結尾帶明確時區標記（Z 或 ±hh:mm / ±hhmm）的字串不屬於台北在地格式，直接交給 Date.parse
const EXPLICIT_TZ_RE = /(?:Z|[+\-]\d{2}:?\d{2})\s*$/i

const toUtcIso = (
  year: string,
  month: string,
  day: string,
  meridiemRaw: string | undefined,
  hourRaw: string,
  minuteRaw: string,
  secondRaw: string | undefined,
) => {
  let hour = Number(hourRaw)
  const minute = Number(minuteRaw)
  const second = Number(secondRaw || "0")
  const meridiem = (meridiemRaw || "").toUpperCase()

  if (meridiem === "PM" && hour < 12) hour += 12
  if (meridiem === "AM" && hour === 12) hour = 0

  const taipeiWallClockMs = Date.UTC(Number(year), Number(month) - 1, Number(day), hour, minute, second)
  return new Date(taipeiWallClockMs - TAIPEI_UTC_OFFSET_MS).toISOString()
}

export const parseSubmittedAt = (value: string, fallbackIso: string | null) => {
  const raw = value.trim()
  if (!raw) return fallbackIso

  if (EXPLICIT_TZ_RE.test(raw)) {
    const explicitTimestamp = Date.parse(raw)
    if (!Number.isNaN(explicitTimestamp)) {
      return new Date(explicitTimestamp).toISOString()
    }
  }

  const normalizedMeridiem = raw
    .replace(/上午/gi, " AM ")
    .replace(/下午/gi, " PM ")
    .replace(/年/g, "/")
    .replace(/月/g, "/")
    .replace(/日/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const ymdMatch = normalizedMeridiem.match(
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s*(AM|PM)?\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/i,
  )

  if (ymdMatch) {
    const [, year, month, day, meridiemRaw, hourRaw, minuteRaw, secondRaw] = ymdMatch
    return toUtcIso(year, month, day, meridiemRaw, hourRaw, minuteRaw, secondRaw)
  }

  const mdyMatch = normalizedMeridiem.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s*(AM|PM)?\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/i,
  )

  if (mdyMatch) {
    const [, month, day, year, meridiemRaw, hourRaw, minuteRaw, secondRaw] = mdyMatch
    return toUtcIso(year, month, day, meridiemRaw, hourRaw, minuteRaw, secondRaw)
  }

  // Keep pipeline stable, but avoid silently using "now" as parse fallback.
  return fallbackIso
}
