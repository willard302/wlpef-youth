import { format as fnsFormat } from 'date-fns'
import type { Event, EventRegistration } from '~/types'
import { eventAdminService } from '~/services/eventAdmin.js'

export const useAdminRegistrations = () => {
  const { addToast } = useToast()
  const { selectedEvent, registrations, isPickerLoading, changeEvent } = useAdminEventPicker()
  const { searchQuery } = useSearch()
  const supabase = useSupabaseClient<any>()

  const isSyncing = ref(false)
  const currentPage = ref(1)
  const itemsPerPage = 15
  const feedbackStatusByUserId = ref<Record<string, 'granted' | 'submitted'>>({})
  const feedbackStatusByEmail = ref<Record<string, 'granted' | 'submitted'>>({})

  const selectedRegistration = ref<EventRegistration | null>(null)
  const registrationDetailVisible = ref(false)

  const openRegistrationDetail = (registration: EventRegistration) => {
    selectedRegistration.value = registration
    registrationDetailVisible.value = true
  }

  const normalizeEmail = (email?: string | null) => (email || '').trim().toLowerCase()

  const fetchFeedbackStatuses = async(eventId: string) => {
    const { data, error } = await supabase
      .from('event_feedback_responses')
      .select('matched_user_id, email, feedback_points_granted_at')
      .eq('event_id', eventId)

    if (error) throw error

    const byUserId: Record<string, 'granted' | 'submitted'> = {}
    const byEmail: Record<string, 'granted' | 'submitted'> = {}

    for (const row of data ?? []) {
      const status: 'granted' | 'submitted' = row.feedback_points_granted_at ? 'granted' : 'submitted'

      if (row.matched_user_id) {
        const existing = byUserId[row.matched_user_id]
        if (!existing || status === 'granted') byUserId[row.matched_user_id] = status
      }

      const normalized = normalizeEmail(row.email)
      if (normalized) {
        const existing = byEmail[normalized]
        if (!existing || status === 'granted') byEmail[normalized] = status
      }
    }

    feedbackStatusByUserId.value = byUserId
    feedbackStatusByEmail.value = byEmail
  }

  const clearFeedbackStatuses = () => {
    feedbackStatusByUserId.value = {}
    feedbackStatusByEmail.value = {}
  }

  const resolveFeedbackStatus = (registration: EventRegistration): 'granted' | 'submitted' | 'none' => {
    const byUser = registration.matchedUserId ? feedbackStatusByUserId.value[registration.matchedUserId] : undefined
    const byEmail = feedbackStatusByEmail.value[normalizeEmail(registration.email)]
    const status = byUser || byEmail

    if (status === 'granted') return 'granted'
    if (status === 'submitted') return 'submitted'
    return 'none'
  }

  const handleEventChange = async(event: Event) => {
    currentPage.value = 1
    await changeEvent(event)

    try {
      await fetchFeedbackStatuses(event.id)
    }
    catch (error) {
      console.error('Load feedback statuses error:', error)
      clearFeedbackStatuses()
      addToast('載入會員回饋狀態失敗', 'error')
    }
  }

  const handleSync = async() => {
    if (!selectedEvent.value?.googleSheetId) {
      addToast('此活動未設定 Google 試算表 ID', 'error')
      return
    }

    isSyncing.value = true
    try {
      const { results } = await eventAdminService.syncGoogleSheet(
        selectedEvent.value.id,
        selectedEvent.value.googleSheetId,
      )

      const [firstResult] = results ?? []
      addToast(
        firstResult
          ? `同步完成！匯入 ${firstResult.importedCount} 筆，比對成功 ${firstResult.matchedCount} 筆`
          : '同步完成',
        'success',
      )

      if (!selectedEvent.value) return
      await changeEvent(selectedEvent.value)
    }
    catch (error: any) {
      console.error('Sync error:', error)
      addToast(error.message || '同步失敗，請檢查設定', 'error')
    }
    finally {
      isSyncing.value = false
    }
  }

  const getPointsStatus = (registration: EventRegistration) => {
    return registration.registrationPointsGrantedAt ? '點數已發放' : '處理中'
  }

  const getFirstLoginStatus = (registration: EventRegistration) => {
    return registration.firstLoginEnabled ? '已啟用' : '未啟用'
  }

  const getFeedbackStatus = (registration: EventRegistration) => {
    const status = resolveFeedbackStatus(registration)
    if (status === 'granted') return '回饋已完成'
    if (status === 'submitted') return '已回饋'
    return '未回饋'
  }

  const getFeedbackStatusClass = (registration: EventRegistration) => {
    const status = resolveFeedbackStatus(registration)
    if (status === 'granted') return 'bg-cyan-50 text-cyan-700 border border-cyan-100'
    if (status === 'submitted') return 'bg-sky-50 text-sky-700 border border-sky-100'
    return 'bg-slate-50 text-slate-500 border border-slate-100'
  }
  
  const filteredRegistrations = computed(() => {
    const keyword = searchQuery.value.trim().toLowerCase()
    if (!keyword) return registrations.value

    return registrations.value.filter((registration) => {
      const searchableValues = [
        registration.name,
        registration.email,
        registration.googleSheetRowId,
        ...Object.entries(registration.rawData ?? {}).flatMap(([key, value]) => [key, String(value ?? '')]),
      ]
      return searchableValues.some(value => value?.toLowerCase().includes(keyword))
    })
  })

  const paginatedRegistrations = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredRegistrations.value.slice(start, end)
  })

  const enabledCount = computed(() => registrations.value.filter(registration => registration.firstLoginEnabled).length)
  const disabledCount = computed(() => registrations.value.length - enabledCount.value)

  watch(searchQuery, () => {
    currentPage.value = 1
  })

  return {
    selectedEvent,
    registrations,
    isPickerLoading,
    isSyncing,
    currentPage,
    itemsPerPage,
    selectedRegistration,
    registrationDetailVisible,
    filteredRegistrations,
    paginatedRegistrations,
    enabledCount,
    disabledCount,
    handleEventChange,
    handleSync,
    openRegistrationDetail,
    getPointsStatus,
    getFirstLoginStatus,
    getFeedbackStatus,
    getFeedbackStatusClass,
    fnsFormat,
    searchQuery,
  }
}