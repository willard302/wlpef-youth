import type { EventModalProps, EventModalEmits } from "~/types";
import { format } from 'date-fns'

export const useEventModal = (
  props: EventModalProps,
  emit: EventModalEmits
) => {
  const eventDetailVisible = computed({
    get: () => props.show,
    set: (val) => emit('update:show', val)
  })

  const canViewAllEventStatus = computed(() => props.canViewAllEventStatus ?? false)
  const isRegistered = computed(() => props.isRegistered ?? false)
  const isCheckedIn = computed(() => props.isCheckedIn ?? false)
  const isFeedbackSubmitted = computed(() => props.isFeedbackSubmitted ?? false)
  const isCheckinFormSubmitted = computed(() => props.isCheckinFormSubmitted ?? false)
  const checkingRegistration = computed(() => props.checkingRegistration ?? false)
  const canSeeStaffFeatures = computed(() => props.canSeeStaffFeatures ?? false)
  const selectedEvent = computed(() => props.selectedEvent)

  const selectedEventStatus = computed(() => selectedEvent.value?.status)
  const selectedEventHasForm = computed(() => Boolean(selectedEvent.value?.googleFormUrl))
  const selectedEventHasFeedbackForm = computed(() => Boolean(selectedEvent.value?.feedbackFormUrl))
  const selectedEventFeedbackMode = computed(() => selectedEvent.value?.feedbackVisibilityMode ?? 'test')
  const selectedEventHasCheckinForm = computed(() => Boolean(selectedEvent.value?.checkinFormUrl))
  const selectedEventCheckinMode = computed(() => selectedEvent.value?.checkinVisibilityMode ?? 'test')
  
  const selectedEventDateLabel = computed(() => {
    if (!selectedEvent.value) return ''
    return selectedEvent.value.time && selectedEvent.value.period
      ? `${selectedEvent.value.time} ${selectedEvent.value.period}`
      : format(selectedEvent.value.startAt, 'HH:mm')
  })

  const handleRegister = () => emit('register')
  const handleFeedback = () => emit('feedback')
  const handleCheckinForm = () => emit('checkin-form')

  const canShowFeedbackAction = computed(() => {
    if (!selectedEvent.value || !selectedEventHasFeedbackForm.value) return false
    if (selectedEventFeedbackMode.value === 'live') return true
    return canSeeStaffFeatures.value
  })

  const canShowCheckinFormAction = computed(() => {
    if (!selectedEvent.value || !selectedEventHasCheckinForm.value) return false
    if (selectedEventCheckinMode.value === 'live') return true
    return canSeeStaffFeatures.value
  })

  const feedbackButtonClass = computed(() => {
    if (isFeedbackSubmitted.value) {
      return 'bg-amber-500 text-white cursor-not-allowed shadow-amber-200'
    }
    return 'bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-[0.98]'
  })

  const checkinFormButtonClass = computed(() => {
    if (isCheckinFormSubmitted.value) {
      return 'bg-emerald-500 text-white cursor-not-allowed shadow-emerald-200'
    }

    return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-[0.98]'
  })

  const isActionDisabled = computed(() => {
    if (!props.selectedEvent) return true
    return (
      isCheckedIn.value ||
      isRegistered.value ||
      checkingRegistration.value ||
      selectedEventStatus.value === 'closed' ||
      !selectedEventHasForm.value
    )
  })

  const actionButtonClass = computed(() => {
    if (isCheckedIn.value) return 'bg-red-700 text-white cursor-not-allowed shadow-red-200/50'
    if (isRegistered.value) return 'bg-red-500 text-white cursor-not-allowed shadow-red-200'
    if (!props.selectedEvent) return 'bg-red-50 text-red-300 border border-red-100 cursor-not-allowed'
    return selectedEventStatus.value === 'closed' || !selectedEventHasForm.value
      ? 'bg-transparent text-red-500 border border-red-500 cursor-not-allowed'
      : 'bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98] shadow-rose-200'
  })

  const actionIconName = computed(() => {
    if (isCheckedIn.value) return 'task_alt'
    if (isRegistered.value) return 'check_circle'
    if (!props.selectedEvent) return 'open_in_new'
    return selectedEventStatus.value === 'closed' ? 'lock' : 'open_in_new'
  })

  const actionLabel = computed(() => {
    if (isCheckedIn.value) return '已完成活動報到'
    if (isRegistered.value) return '已完成報名'
    if (!props.selectedEvent) return '前往 Google 表單報名'
    return selectedEventStatus.value === 'closed'
      ? '報名已截止'
      : (!selectedEventHasForm.value ? '尚未開放報名' : '前往 Google 表單報名')
  })

  return {
    eventDetailVisible,
    selectedEvent,
    selectedEventDateLabel,
    canViewAllEventStatus,
    isRegistered,
    isCheckedIn,
    isFeedbackSubmitted,
    isCheckinFormSubmitted,
    checkingRegistration,
    canSeeStaffFeatures,
    selectedEventStatus,
    selectedEventHasForm,
    selectedEventHasFeedbackForm,
    selectedEventFeedbackMode,
    selectedEventHasCheckinForm,
    selectedEventCheckinMode,
    canShowFeedbackAction,
    canShowCheckinFormAction,
    feedbackButtonClass,
    checkinFormButtonClass,
    isActionDisabled,
    actionButtonClass,
    actionIconName,
    actionLabel,
    handleRegister,
    handleFeedback,
    handleCheckinForm
  }
}
