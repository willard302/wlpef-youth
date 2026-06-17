import type { Database } from '@/types/database.types'

type Event = Database['public']['Tables']['events']
type Registration = Database['public']['Tables']['event_registrations']
type Checkin = Database['public']['Tables']['checkin_records']
type Profile = Database['public']['Tables']['profiles']

export type EventRow = Event['Row']
export type EventInsert = Event['Insert']
export type EventUpdate = Event['Update']

export type RegistrationRow = Registration['Row']

export type CheckinRow = Checkin['Row']

export type ProfileUpdate = Profile['Update']