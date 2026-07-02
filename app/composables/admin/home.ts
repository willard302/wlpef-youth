import type { Event } from "~/types"
import { format as fnsFormat } from 'date-fns'
import { eventAdminService } from '~/services/eventAdmin.js'

export const useAdminHome = () => {

  const { openMenu } = useSideMenu()
  const { addToast } = useToast()
  const router = useRouter()

  const isLoading = ref(true)
  const events = ref<Event[]>([])
  const selectedEvent = ref<Event | null>(null)
  const showEventPicker = ref(false)
  const pointsBreakdownVisible = ref(false)
  const eventFormVisible = ref(false)
  const editingEventId = ref<string | null>(null)

  const stats = ref({
    totalProfiles: 0,
    eventRegistrations: 0,
    eventCheckins: 0,
    totalPoints: 0,
    pointsBreakdown: { registration: 0, checkin: 0 }
  })
  

  const headerActions = computed(() => [
    { label: 'checkin', icon: 'qr_code_scanner', action: () => router.push('/admin/checkin') },
    { label: 'menu', icon: 'menu', action: openMenu }
  ])

  const eventPickerActions = computed(() => {
    return events.value.map(event => ({
      name: event.title,
      subname: event.startAt ? fnsFormat(new Date(event.startAt), 'yyyy/MM/dd') : '',
      callback: () => selectEvent(event)
    }))
  })

  const displayStats = computed(() => [
    { 
      id: 'profiles',
      label: '會員人數', 
      value: stats.value.totalProfiles.toString(), 
      icon: 'person_check', 
      color: 'text-blue-500', 
      bg: 'bg-blue-50',
      clickable: true,
      path: '/admin/members'
    },
    { 
      id: 'registrations',
      label: '報名人數', 
      value: stats.value.eventRegistrations.toString(), 
      icon: 'how_to_reg', 
      color: 'text-indigo-500', 
      bg: 'bg-indigo-50',
      clickable: true,
      path: '/admin/registrations'
    },
    { 
      id: 'checkins',
      label: '出席人數', 
      value: stats.value.eventCheckins.toString(), 
      icon: 'check_circle', 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-50',
      clickable: true,
      path: '/admin/attendance'
    },
    { 
      id: 'points',
      label: '點數發放', 
      value: stats.value.totalPoints >= 1000 ? `${(stats.value.totalPoints / 1000).toFixed(0)}k` : stats.value.totalPoints.toString(), 
      icon: 'database', 
      color: 'text-amber-500', 
      bg: 'bg-amber-50',
      clickable: true,
      action: () => { pointsBreakdownVisible.value = true }
    },
  ])

  const openEventEditor = (id: string | null = null) => {
    editingEventId.value = id
    eventFormVisible.value = true
  }

  const selectEvent = (event: Event) => {
    selectedEvent.value = event
    showEventPicker.value = false
    loadDashboardStats()
  }

  const loadDashboardStats = async () => {
    if (!selectedEvent.value) return
    
    isLoading.value = true
    try {
      const data = await eventAdminService.fetchAdminDashboardStats(selectedEvent.value.id)
      stats.value = data
    } catch (err: any) {
      addToast('載入統計數據失敗', 'error')
    } finally {
      isLoading.value = false
    }
  }

  const loadEvents = async () => {
    try {
      const data = await eventAdminService.fetchAllEventsForAdmin()
      events.value = data
      if (data.length > 0 ) {

        if (!selectedEvent.value) {
          selectedEvent.value = data[0]!!
        }

        await loadDashboardStats()
      } else {
        isLoading.value = false
      }
    } catch (err: any) {
      addToast('載入活動列表失敗', 'error')
      isLoading.value = false
    }
  }

  return {
    isLoading,
    events,
    selectedEvent,
    showEventPicker,
    pointsBreakdownVisible,
    eventFormVisible,
    editingEventId,
    stats,
    headerActions,
    eventPickerActions,
    displayStats,
    openEventEditor,
    selectEvent,
    loadEvents,
    loadDashboardStats,
  }
}
