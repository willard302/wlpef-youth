import type { RafflePrizeSetting } from "~/types"

export const normalizeRafflePrizeSettings = (prizes?: Array<Partial<RafflePrizeSetting> | null> | null) => {
  const parseLegacyDrawOrder = (value: unknown, fallback: number) => {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed)
    return fallback
  }

  const items = (prizes ?? []).map((prize, index) => ({
    prize: (prize?.prize ?? (prize as any)?.order ?? '').toString().trim(),
    name: prize?.name?.trim() ?? '',
    count: Math.max(1, Math.floor(Number(prize?.count) || 1)),
    drawOrder: Math.max(1, parseLegacyDrawOrder(prize?.drawOrder ?? (prize as any)?.order, index + 1)),
  }))

  while (items.length) {
    const last = items[items.length - 1]
    if (last && !last.prize && !last.name && last.count === 1) {
      items.pop()
      continue
    }
    break
  }

  return items.sort((a, b) => {
    if (a.drawOrder !== b.drawOrder) return a.drawOrder - b.drawOrder
    return a.prize.localeCompare(b.prize)
  })
}

export const getRafflePrizeSettingByOrder = (order: string | number, prizes?: Array<Partial<RafflePrizeSetting> | null> | null) => {
  const round = Number(order)
  if (!Number.isFinite(round) || round < 1) return null
  return normalizeRafflePrizeSettings(prizes)[Math.floor(round) - 1] ?? null
}

export const getRafflePrizeCountByOrder = (order: string | number, prizes?: Array<Partial<RafflePrizeSetting> | null> | null) => {
  return getRafflePrizeSettingByOrder(order, prizes)?.count ?? 1
}

// Backward-compatible aliases for existing call sites during the refactor.
export const getRafflePrizeSettingByRound = getRafflePrizeSettingByOrder
export const getRafflePrizeCountByRound = getRafflePrizeCountByOrder
