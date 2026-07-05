import { format as fnsFormat } from 'date-fns'
import type { Event } from '~/types'
import { eventService } from '~/services/event'


export const useEventUpcoming = (canViewAllEventStatus: Ref<boolean>) => {

  const isEventLoading = ref(true)
  const upcomingEventData = ref<Event | null>(null)
  const isOngoing = ref(false)
  const isUpcomingRegistrationLoading = ref(false)
  const isUpcomingRegistered = ref(false)
  const isUpcomingCheckedIn = ref(false)

  const upcomingEventDisplay = computed(() => {
    const event = upcomingEventData.value
    if (!event) {
      return {
        title: '目前沒有活動',
        meta: canViewAllEventStatus.value ? '管理員：建立活動並發佈後會顯示在這裡' : '請稍後再查看最新活動',
      }
    }

    const timeText = event.allDay
      ? fnsFormat(event.startAt, 'MM/dd')
      : fnsFormat(event.startAt, 'MM/dd HH:mm')

    return {
      id: event.id,
      title: event.title,
      meta: `${timeText} · ${event.location || '地點未定'}`,
    }
  })

  const upcomingRegistrationStatus = computed(() => {
    const event = upcomingEventData.value
    if (!event) return ''
    if (canViewAllEventStatus.value) return EVENT_STATUS_LABEL_MAP[event.status]
    if (isUpcomingRegistrationLoading.value) return '確認狀態中'
    if (isUpcomingCheckedIn.value) return '已報到'
    if (isUpcomingRegistered.value) return '已報名'
    if (event.status === 'closed') return '報名已關閉'
    return '未報名'
  })

  const loadUpcomingEvent = async () => {
    isEventLoading.value = true
    isUpcomingRegistered.value = false
    isUpcomingRegistrationLoading.value = false
    isOngoing.value = false

    try {
      const status = canViewAllEventStatus.value ? undefined : 'published'
      
      // First, check for ongoing events
      const ongoingEvents = await eventService.fetchOngoingEvents(status)
      
      if (ongoingEvents.length > 0) {
        upcomingEventData.value = ongoingEvents[0] || null
        isOngoing.value = true
      } else {
        // If no ongoing events, fetch upcoming events
        const events = await eventService.fetchUpcomingEvents(1, status)
        upcomingEventData.value = events[0] || null
        isOngoing.value = false
      }

      if (upcomingEventData.value && !canViewAllEventStatus.value) {
        isUpcomingRegistrationLoading.value = true
        const [regStatus, checkinStatus] = await Promise.all([
          eventService.checkRegistrationStatus(upcomingEventData.value.id),
          eventService.checkCheckinStatus(upcomingEventData.value.id)
        ])
        isUpcomingRegistered.value = regStatus
        isUpcomingCheckedIn.value = checkinStatus
      }
    } catch (error) {
      console.error('Failed to load events', error)
      upcomingEventData.value = null
      isUpcomingRegistered.value = false
    } finally {
      isUpcomingRegistrationLoading.value = false
      isEventLoading.value = false
    }
  }

  return {
    isEventLoading,
    isOngoing,
    isUpcomingRegistrationLoading,
    isUpcomingRegistered,
    isUpcomingCheckedIn,
    upcomingEventData,
    upcomingEventDisplay,
    upcomingRegistrationStatus,
    loadUpcomingEvent,
  }
}
