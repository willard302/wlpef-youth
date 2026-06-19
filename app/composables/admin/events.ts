import type { CreateEventPayload, Event, EventInsert, EventUpdate} from "~/types"
import type { Database } from '~/types'

const getSupabase = () => useSupabaseClient<Database>()

export const useAdminEvents = () => {
    const createEventToDatabase = async(payload: CreateEventPayload): Promise<Event> => {
      validateTimeRange(payload.start_at, payload.end_at)
  
      const supabase = getSupabase()
      const { data: authData, error: authError } = await supabase.auth.getUser()
  
      if (authError) throw authError
      if (!authData.user) throw new Error('請先登入後再新增活動')
  
      const insertPayload: EventInsert = {
        ...payload,
        created_by: authData.user.id,
      }
  
      const { data, error } = await supabase
        .from('events')
        .insert(insertPayload)
        .select()
        .single()
  
      if (error) throw error
      return mapToEvent(data)
    }
  
    const updateEventToDatabase = async(id: string, payload: Partial<CreateEventPayload>): Promise<Event> => {
      if (payload.start_at && payload.end_at) {
        validateTimeRange(payload.start_at, payload.end_at)
      }
  
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('events')
        .update(payload as EventUpdate)
        .eq('id', id)
        .select()
        .single()
  
      if (error) throw error
      return mapToEvent(data)
    }
  
    const deleteEventToDatabase = async(id: string): Promise<void> => {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)
  
      if (error) throw error
    }
  
  return {
    createEventToDatabase,
    updateEventToDatabase,
    deleteEventToDatabase,
  }
}
