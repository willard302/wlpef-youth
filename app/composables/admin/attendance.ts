import type { Event, EventCheckin } from '~/types'
import { eventAdminService } from '~/services/eventAdmin.js'

export const useAdminAttendance = () => {
  const { addToast } = useToast()
  const { selectedEvent, registrations, isPickerLoading, changeEvent } = useAdminEventPicker()
  const { searchQuery } = useSearch()

  const attendance = ref<EventCheckin[]>([])
  const selectedAttendance = ref<EventCheckin | null>(null)
  const showAttendanceDetail = ref(false)
  const isLoadingAttendance = ref(false)

  const loadAttendance = async(eventId?: string) => {
    if (!eventId) {
      attendance.value = []
      return
    }

    isLoadingAttendance.value = true
    try {
      attendance.value = await eventAdminService.fetchAttendanceByEventId(eventId)
    }
    catch (error: any) {
      addToast(error.message || '載入出席名單失敗', 'error')
      attendance.value = []
    }
    finally {
      isLoadingAttendance.value = false
    }
  }

  const handleEventChange = async(event: Event) => {
    await changeEvent(event)
  }

  const openAttendanceDetail = (item: EventCheckin) => {
    selectedAttendance.value = item
    showAttendanceDetail.value = true
  }

  const filteredAttendance = computed(() => {
    const keyword = searchQuery.value.trim().toLowerCase()
    if (!keyword) return attendance.value

    return attendance.value.filter((item) => {
      return (
        item.userName?.toLowerCase().includes(keyword) ||
        item.email.toLowerCase().includes(keyword) ||
        item.checkinMethod?.toLowerCase().includes(keyword)
      )
    })
  })

  const attendanceCount = computed(() => attendance.value.length)
  const registrationCount = computed(() => registrations.value.length)

  watch(selectedEvent, async(event) => {
    await loadAttendance(event?.id)
  }, { immediate: true })

  return {
    selectedEvent,
    registrations,
    isPickerLoading,
    isLoadingAttendance,
    attendance,
    selectedAttendance,
    showAttendanceDetail,
    filteredAttendance,
    attendanceCount,
    registrationCount,
    searchQuery,
    handleEventChange,
    openAttendanceDetail,
  }
}
