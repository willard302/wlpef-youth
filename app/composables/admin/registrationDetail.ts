import type { Ref } from 'vue'
import type { EventRegistration, PointTransaction } from '~/types'

export const useAdminRegistrationDetail = (
  show: Ref<boolean>,
  selectedRegistration: Ref<EventRegistration | null>
) => {
  const supabase = useSupabaseClient<any>()
  const { addToast } = useToast()
  const currentTotalPoints = ref<number | null>(null)
  const isPointsLoading = ref(false)
  const pointsDetailsVisible = ref(false)
  const isTransactionsLoading = ref(false)
  const pointTransactions = ref<PointTransaction[]>([])

  const loadCurrentTotalPoints = async(registration: EventRegistration | null) => {
    if (!registration?.matchedUserId) {
      currentTotalPoints.value = null
      return
    }

    isPointsLoading.value = true
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', registration.matchedUserId)
        .maybeSingle()

      if (error) throw error
      currentTotalPoints.value = data?.points ?? 0
    }
    catch (error) {
      console.error('Load current total points error:', error)
      currentTotalPoints.value = null
    }
    finally {
      isPointsLoading.value = false
    }
  }

  watch(
    () => [show.value, selectedRegistration.value?.id] as const,
    async([visible]) => {
      if (!visible) return
      await loadCurrentTotalPoints(selectedRegistration.value)
    },
    { immediate: true }
  )

  const loadPointTransactions = async(registration: EventRegistration | null) => {
    if (!registration?.matchedUserId) {
      pointTransactions.value = []
      return
    }

    isTransactionsLoading.value = true
    try {
      const { data, error } = await supabase
        .from('point_transactions')
        .select('id, user_id, event_id, points, type, description, created_at, events(title)')
        .eq('user_id', registration.matchedUserId)
        .order('created_at', { ascending: false })

      if (error) throw error

      pointTransactions.value = (data ?? []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        eventId: row.event_id,
        points: row.points,
        type: row.type,
        description: row.description,
        createdAt: row.created_at,
        eventTitle: row.events?.title,
      }))
    }
    catch (error) {
      console.error('Load point transactions error:', error)
      pointTransactions.value = []
      addToast('載入點數明細失敗', 'error')
    }
    finally {
      isTransactionsLoading.value = false
    }
  }

  const openPointsDetails = async() => {
    if (!selectedRegistration.value?.matchedUserId) {
      addToast('尚未綁定會員，無法查看點數明細', 'error')
      return
    }

    pointsDetailsVisible.value = true
    await loadPointTransactions(selectedRegistration.value)
  }

  return {
    currentTotalPoints,
    isPointsLoading,
    pointsDetailsVisible,
    isTransactionsLoading,
    pointTransactions,
    loadCurrentTotalPoints,
    openPointsDetails,
  }
}