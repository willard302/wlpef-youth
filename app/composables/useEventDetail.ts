import type { Event } from '~/types'
import { eventService } from '~/services/event'

export const useEventDetail = (userProfile: Ref<any>) => {
  const { addToast } = useToast()
  const router = useRouter()

  const eventDetailVisible = ref(false)
  const selectedEvent = ref<Event | null>(null)
  const isRegistered = ref(false)
  const isCheckedIn = ref(false)
  const checkingRegistration = ref(false)

  const canSeeStaffFeatures = computed(() => {
    return (
      userProfile.value?.role === 'admin' ||
      userProfile.value?.role === 'staff'
    )
  })

  const navigateToEditEvent = (eventId: string) => {
    router.push({ path: '/admin/events', query: { id: eventId } })
  }

  const openEventDetail = async (event: Event) => {
    if (!event) return
    
    // 如果是管理員，直接跳轉到編輯頁面
    if (userProfile.value?.role === 'admin') {
      navigateToEditEvent(event.id)
      return
    }

    selectedEvent.value = event
    eventDetailVisible.value = true
    isRegistered.value = false
    isCheckedIn.value = false
    checkingRegistration.value = true
    
    try {
      const [regStatus, checkinStatus] = await Promise.all([
        eventService.checkRegistrationStatus(event.id),
        eventService.checkCheckinStatus(event.id)
      ])
      isRegistered.value = regStatus
      isCheckedIn.value = checkinStatus
    } catch (err) {
      console.error('Check status error:', err)
    } finally {
      checkingRegistration.value = false
    }
  }

  const handleRegister = async () => {
    if (!selectedEvent.value || isRegistered.value) return

    const formUrl = selectedEvent.value.googleFormUrl
    if (!formUrl) {
      addToast('此活動尚未設定 Google 表單連結', 'error')
      return
    }

    window.open(formUrl, '_blank', 'noopener,noreferrer')
  }

  const handleOpenFeedback = () => {
    if (!selectedEvent.value) return

    const feedbackUrl = selectedEvent.value.feedbackFormUrl
    if (!feedbackUrl) {
      addToast('此活動尚未設定回饋問券', 'error')
      return
    }

    window.open(feedbackUrl, '_blank', 'noopener,noreferrer')
  }

  return {
    eventDetailVisible,
    selectedEvent,
    isRegistered,
    isCheckedIn,
    checkingRegistration,
    canSeeStaffFeatures,
    openEventDetail,
    handleRegister,
    handleOpenFeedback,
    navigateToEditEvent
  }
}
