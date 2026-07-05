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
      .select('email, feedback_points_granted_at')
      .eq('event_id', eventId)

    if (error) throw error
    const byEmail: Record<string, 'granted' | 'submitted'> = {}

    for (const row of data ?? []) {
      const status: 'granted' | 'submitted' = row.feedback_points_granted_at ? 'granted' : 'submitted'

      const normalized = normalizeEmail(row.email)
      if (normalized) {
        const existing = byEmail[normalized]
        if (!existing || status === 'granted') byEmail[normalized] = status
      }
    }

    feedbackStatusByEmail.value = byEmail
  }

  const clearFeedbackStatuses = () => {
    feedbackStatusByEmail.value = {}
  }

  const resolveFeedbackStatus = (registration: EventRegistration): 'granted' | 'submitted' | 'none' => {
    const byEmail = feedbackStatusByEmail.value[normalizeEmail(registration.email)]
    if (byEmail === 'granted') return 'granted'
    if (byEmail === 'submitted') return 'submitted'
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

  const handleSyncRegistrations = async() => {
    if (!selectedEvent.value?.googleSheetId) {
      addToast('此活動未設定 Google 試算表 ID', 'error')
      return
    }

    isSyncing.value = true
    try {
      const syncTarget = selectedEvent.value.feedbackResponseSheetId ? 'both' : 'registration'
      const { results } = await eventAdminService.syncGoogleSheet(
        selectedEvent.value.id,
        {
          sheetId: selectedEvent.value.googleSheetId,
          feedbackSheetId: selectedEvent.value.feedbackResponseSheetId,
          syncTarget,
        },
      )

      const [firstResult] = results ?? []
      if (firstResult) {
        const registrationMessage = `報名匯入 ${firstResult.registrationImportedCount || 0} 筆，比對成功 ${firstResult.registrationMatchedCount || 0} 筆`
        const feedbackMessage = syncTarget !== 'registration'
          ? `；回饋匯入 ${firstResult.feedbackImportedCount || 0} 筆，比對成功 ${firstResult.feedbackMatchedCount || 0} 筆`
          : ''

        addToast(`同步完成！${registrationMessage}${feedbackMessage}`, 'success')
      }
      else {
        addToast('同步完成', 'success')
      }

      if (!selectedEvent.value) return
      await changeEvent(selectedEvent.value)
      await fetchFeedbackStatuses(selectedEvent.value.id)
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
    if (status === 'granted') return '表單回饋已完成' // 已回饋且回饋點數已發放
    if (status === 'submitted') return '表單回饋已完成'  // 已送出回饋，但尚未發放回饋點數
    return '表單回饋未完'
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
    handleSyncRegistrations,
    openRegistrationDetail,
    getPointsStatus,
    getFirstLoginStatus,
    getFeedbackStatus,
    getFeedbackStatusClass,
    fnsFormat,
    searchQuery,
  }
}