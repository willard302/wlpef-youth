import type { Database } from '@/types/database.types'

type PublicTables = Database['public']['Tables']

export type EventRow = PublicTables['events']['Row']
export type EventInsert = PublicTables['events']['Insert']
export type EventUpdate = PublicTables['events']['Update']

export type RegistrationRow = PublicTables['event_registrations']['Row']
export type RegistrationInsert = PublicTables['event_registrations']['Insert']
export type RegistrationUpdate = PublicTables['event_registrations']['Update']

export type CheckinRow = PublicTables['checkin_records']['Row']
export type CheckinInsert = PublicTables['checkin_records']['Insert']
export type CheckinUpdate = PublicTables['checkin_records']['Update']

export type ProfileRow = PublicTables['profiles']['Row']
export type ProfileInsert = PublicTables['profiles']['Insert']
export type ProfileUpdate = PublicTables['profiles']['Update']

export type PointTransactionRow = PublicTables['point_transactions']['Row']
export type PointTransactionInsert = PublicTables['point_transactions']['Insert']
export type PointTransactionUpdate = PublicTables['point_transactions']['Update']