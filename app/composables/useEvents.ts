import { 
  add, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay,
  isSameMonth, startOfDay, startOfMonth, startOfWeek, sub 
} from 'date-fns'
import type { Role, Event } from '~/types'
import { eventService } from '~/services/event'

export const useEvents = () => {
  const { userProfile } = useUser()

  const isCalendarLoading = ref(false)
  const allEvents = ref<Event[]>([])

  const today = ref(new Date())
  const currentDate = ref(new Date())
  const selectedDate = ref(today.value)

  const currentUserId = computed(() => userProfile.value?.id || null)
  const currentRole = computed(() => (userProfile.value?.role as Role) || null)

  const isAdmin = computed(() => currentRole.value === 'admin')

  const canViewAllEventStatus = computed(() => currentRole.value === 'admin')

  const canEditEvent = (createdBy: string): boolean => {
    if (currentRole.value === 'admin') return true
    return Boolean(currentUserId.value && createdBy === currentUserId.value)
  }

  const canDeleteEvent = (createdBy: string): boolean => canEditEvent(createdBy)

  const monthYear = computed(() => format(currentDate.value, 'yyyy / MM'))

  const calendarGrid = computed(() => {
    const monthStart = startOfMonth(currentDate.value)
    const monthEnd = endOfMonth(currentDate.value)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

    return eachDayOfInterval({ start: startDate, end: endDate })
  })

  const isToday = (date: Date) => isSameDay(date, today.value)
  const isSelected = (date: Date) => isSameDay(date, selectedDate.value)
  const isCurrentMonth = (date: Date) => isSameMonth(date, currentDate.value)

  const isEventOnDate = (event: Event, targetDate: Date): boolean => {
    const start = startOfDay(event.startAt)
    const end = startOfDay(event.endAt)
    const target = startOfDay(targetDate)

    return target >= start && target <= end
  }

  const selectDate = (date: Date) => {
    selectedDate.value = date
  }

  const previousMonth = () => {
    currentDate.value = sub(currentDate.value, { months: 1 })
  }

  const nextMonth = () => {
    currentDate.value = add(currentDate.value, { months: 1 })
  }

  const goToToday = () => {
    const now = new Date()
    currentDate.value = now
    selectedDate.value = now
  }

  const eventsForSelectedDate = computed(() => {
    const visibleEvents = canViewAllEventStatus.value
      ? allEvents.value
      : allEvents.value.filter(event => event.status === 'published')

    return visibleEvents.filter(event => isEventOnDate(event, selectedDate.value))
  })

  const eventsInMonth = computed(() => {
    const eventsMap = new Map<number, boolean>()
    const visibleEvents = canViewAllEventStatus.value
      ? allEvents.value
      : allEvents.value.filter(event => event.status === 'published')

    const monthStart = startOfMonth(currentDate.value)
    const monthEnd = endOfMonth(currentDate.value)

    // O(events) — 遍歷活動一次，標記有活動的日期
    for (const event of visibleEvents) {
      const start = startOfDay(event.startAt)
      const end = startOfDay(event.endAt)

      // 只處理與當月有交集的活動
      if (end < monthStart || start > monthEnd) continue

      // 計算活動在當月的實際範圍
      const clampedStart = start < monthStart ? monthStart : start
      const clampedEnd = end > monthEnd ? monthEnd : end

      const days = eachDayOfInterval({ start: clampedStart, end: clampedEnd })
      for (const day of days) {
        eventsMap.set(day.getDate(), true)
      }
    }

    return eventsMap
  })

  const loadEvents = async () => {
    isCalendarLoading.value = true

    try {
      allEvents.value = await eventService.fetchEvents(format(currentDate.value, 'yyyy-MM'))
    } catch (error) {
      console.error('Failed to load events', error)
      allEvents.value = []
    } finally {
      isCalendarLoading.value = false
    }
  }

  watch(currentDate, () => {
    loadEvents()
  })

  return {
    today,
    currentDate,
    selectedDate,
    monthYear,
    calendarGrid,
    isToday,
    isSelected,
    isCurrentMonth,
    selectDate,
    previousMonth,
    nextMonth,
    goToToday,
    eventsForSelectedDate,
    eventsInMonth,
    format,
    loadEvents,
    isCalendarLoading,
    isAdmin,
    canEditEvent,
    canDeleteEvent,
    canViewAllEventStatus
  }
}
