import { format as fnsFormat } from 'date-fns'
import type { Event, EventRegistration } from '~/types'
import { eventAdminService } from '~/services/eventAdmin.js'

export const useAdminRegistrations = () => {
  const { addToast } = useToast()
  const { selectedEvent, registrations, isPickerLoading, changeEvent } = useAdminEventPicker()
  const { searchQuery } = useSearch()

  const isSyncing = ref(false)
  const currentPage = ref(1)
  const itemsPerPage = 15

  const selectedRegistration = ref<EventRegistration | null>(null)
  const registrationDetailVisible = ref(false)

  const openRegistrationDetail = (registration: EventRegistration) => {
    selectedRegistration.value = registration
    registrationDetailVisible.value = true
  }

  const handleEventChange = async(event: Event) => {
    currentPage.value = 1
    await changeEvent(event)
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
    fnsFormat,
    searchQuery,
  }
}