import type { Database, CreateEventPayload, Event, EventInsert, EventUpdate} from "~/types"

const getSupabase = () => useSupabaseClient<Database>()

export const useAdminEvents = () => {
  
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
  
  
  return {
    updateEventToDatabase,
  }
}
