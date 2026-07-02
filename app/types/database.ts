import type { Database as SupabaseDatabase } from './database.types'

export type Database = SupabaseDatabase

type PublicTables = Database['public']['Tables']

export type TableName = keyof PublicTables
export type TableRow<T extends TableName> = PublicTables[T]['Row']
export type TableInsert<T extends TableName> = PublicTables[T]['Insert']
export type TableUpdate<T extends TableName> = PublicTables[T]['Update']

export type EventRow = TableRow<'events'>
export type EventInsert = TableInsert<'events'>
export type EventUpdate = TableUpdate<'events'>

export type RegistrationRow = TableRow<'event_registrations'>
export type RegistrationInsert = TableInsert<'event_registrations'>
export type RegistrationUpdate = TableUpdate<'event_registrations'>

export type CheckinRow = TableRow<'checkin_records'>
export type CheckinInsert = TableInsert<'checkin_records'>
export type CheckinUpdate = TableUpdate<'checkin_records'>

export type ProfileRow = TableRow<'profiles'>
export type ProfileInsert = TableInsert<'profiles'>
export type ProfileUpdate = TableUpdate<'profiles'>

export type PointTransactionRow = TableRow<'point_transactions'>
export type PointTransactionInsert = TableInsert<'point_transactions'>
export type PointTransactionUpdate = TableUpdate<'point_transactions'>

export type RaffleWinnerRow = TableRow<'raffle_winners'>
export type RaffleWinnerInsert = TableInsert<'raffle_winners'>
export type RaffleWinnerUpdate = TableUpdate<'raffle_winners'>