import type { EventStatus } from '~/types'

export const EVENT_STATUS_LABEL_MAP: Record<EventStatus, string> = {
  draft: '草稿',
  published: '已發佈',
  closed: '已關閉',
}

export const EVENT_STATUS_CLASS_MAP: Record<EventStatus, string> = {
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
}
