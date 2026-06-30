import { eventAdminService } from "~/services/eventAdmin"
import type { Event, EventRegistration } from "~/types"

const selectedEvent = ref<Event | null>(null)
const registrations = ref<EventRegistration[]>([])
const isPickerLoading = ref(false)

export const useAdminEventPicker = () => {
  const { addToast } = useToast()

  const changeEvent = async(event: Event | null) => {
    selectedEvent.value = event
    if (!event) {
      registrations.value = []
      return
    }

    isPickerLoading.value = true
    try {
      registrations.value = await eventAdminService.fetchRegistrationsByEventId(event.id)
    } catch(err: any) {
      addToast(err.message || '載入活動報名名單失敗', 'error')
      registrations.value = []
    } finally {
      isPickerLoading.value = false
    }
  }

  return {
    selectedEvent,
    registrations,
    isPickerLoading,
    changeEvent
  }
}
