export type PointTransactionKind = 'registration' | 'checkin' | 'bonus' | 'manual'

export interface PointTransactionMeta {
  label: string
  icon: string
  colorClass: string
}

const POINT_TRANSACTION_META_MAP: Record<PointTransactionKind, PointTransactionMeta> = {
  registration: {
    label: '活動報名',
    icon: 'how_to_reg',
    colorClass: 'text-sky-500 bg-sky-50',
  },
  checkin: {
    label: '現場簽到',
    icon: 'fact_check',
    colorClass: 'text-emerald-500 bg-emerald-50',
  },
  bonus: {
    label: '額外獎勵',
    icon: 'redeem',
    colorClass: 'text-amber-500 bg-amber-50',
  },
  manual: {
    label: '手動調整',
    icon: 'edit_note',
    colorClass: 'text-slate-500 bg-slate-50',
  },
}

const DEFAULT_POINT_TRANSACTION_META: PointTransactionMeta = {
  label: '點數異動',
  icon: 'stars',
  colorClass: 'text-slate-500 bg-slate-50',
}

export const getPointTransactionMeta = (type: string): PointTransactionMeta => {
  return POINT_TRANSACTION_META_MAP[type as PointTransactionKind] ?? DEFAULT_POINT_TRANSACTION_META
}
