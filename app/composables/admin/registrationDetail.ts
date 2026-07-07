import type { Ref } from 'vue'
import type { EventRegistration } from '~/types'

export const useAdminRegistrationDetail = (
  show: Ref<boolean>,
  selectedRegistration: Ref<EventRegistration | null>
) => {
  const supabase = useSupabaseClient<any>()
  const currentTotalPoints = ref<number | null>(null)
  const isPointsLoading = ref(false)

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

  return {
    currentTotalPoints,
    isPointsLoading,
    loadCurrentTotalPoints,
  }
}