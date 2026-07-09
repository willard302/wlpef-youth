import type { Event, CreateEventPayload } from "~/types"
import { addHours, format, parseISO, set } from 'date-fns'

import { eventService } from '~/services/event'

type EventFormState = {
  title: string
  description: string
  location: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  allDay: boolean
  status: CreateEventPayload['status']
  googleSheetId: string
  googleFormUrl: string
  feedbackFormUrl: string
  feedbackResponseSheetId: string
  feedbackBonusPoints: number
  feedbackVisibilityMode: NonNullable<CreateEventPayload['feedback_visibility_mode']>
  checkinFormUrl: string
  checkinResponseSheetId: string
  checkinFormBonusPoints: number
  checkinVisibilityMode: NonNullable<CreateEventPayload['checkin_visibility_mode']>
  checkinFormSyncEnabled: boolean
  registrationBonus: number
  checkinBonus: number
  raffleThreshold: number
}

type BonusField = 'registrationBonus' | 'checkinBonus' | 'raffleThreshold'

const createDefaultFormData = (): EventFormState => ({
  title: '',
  description: '',
  location: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  allDay: false,
  status: 'draft',
  googleSheetId: '',
  googleFormUrl: '',
  feedbackFormUrl: '',
  feedbackResponseSheetId: '',
  feedbackBonusPoints: 0,
  feedbackVisibilityMode: 'test',
  checkinFormUrl: '',
  checkinResponseSheetId: '',
  checkinFormBonusPoints: 0,
  checkinVisibilityMode: 'test',
  checkinFormSyncEnabled: false,
  registrationBonus: 0,
  checkinBonus: 0,
  raffleThreshold: 0,
})

export const useEventForm = () => {
  const router = useRouter()
  const route = useRoute()
  const { addToast } = useToast()
  const { createEventToDatabase, updateEventToDatabase } = useAdminEvents()

  const isSaving = ref(false)
  const isDeleting = ref(false)
  const isInitializing = ref(false)
  const showStartDatePicker = ref(false)
  const showStartTimePicker = ref(false)
  const showEndDatePicker = ref(false)
  const showEndTimePicker = ref(false)

  const editingEventId = ref<string | null>(null)
  const isEditMode = computed(() => editingEventId.value !== null)

  const formData = ref<EventFormState>(createDefaultFormData())

  const bonusItems: Array<{ label: string; icon: string; field: BonusField }> = [
    { label: '報名獎勵點數', icon: 'how_to_reg', field: 'registrationBonus' },
    { label: '簽到獎勵點數', icon: 'fact_check', field: 'checkinBonus' },
    { label: '抽獎門檻（點數）', icon: 'trophy', field: 'raffleThreshold' },
  ]

  let savedStartTime = '14:00'
  let savedEndTime = '15:30'

  const initForm = (dateStr?: string) => {
    formData.value = createDefaultFormData()

    const base = dateStr ? parseISO(dateStr) : new Date()
    const start = set(base, { hours: 14, minutes: 0, seconds: 0, milliseconds: 0 })
    const end = addHours(start, 1.5)

    formData.value.startDate = format(start, 'yyyy-MM-dd')
    formData.value.startTime = format(start, 'HH:mm')
    formData.value.endDate = format(end, 'yyyy-MM-dd')
    formData.value.endTime = format(end, 'HH:mm')
    savedStartTime = formData.value.startTime
    savedEndTime = formData.value.endTime
  }

  const fillFormFromEvent = (event: Event) => {
    formData.value = {
      title: event.title,
      description: event.description,
      location: event.location,
      startDate: format(event.startAt, 'yyyy-MM-dd'),
      startTime: format(event.startAt, 'HH:mm'),
      endDate: format(event.endAt, 'yyyy-MM-dd'),
      endTime: format(event.endAt, 'HH:mm'),
      allDay: event.allDay,
      status: event.status,
      googleSheetId: event.googleSheetId || '',
      googleFormUrl: event.googleFormUrl || '',
      feedbackFormUrl: event.feedbackFormUrl || '',
      feedbackResponseSheetId: event.feedbackResponseSheetId || '',
      feedbackBonusPoints: event.feedbackBonusPoints,
      feedbackVisibilityMode: event.feedbackVisibilityMode,
      checkinFormUrl: event.checkinFormUrl || '',
      checkinResponseSheetId: event.checkinResponseSheetId || '',
      checkinFormBonusPoints: event.checkinFormBonusPoints,
      checkinVisibilityMode: event.checkinVisibilityMode,
      checkinFormSyncEnabled: event.checkinFormSyncEnabled,
      registrationBonus: event.registrationBonus,
      checkinBonus: event.checkinBonus,
      raffleThreshold: event.raffleThreshold,
    }
    savedStartTime = formData.value.startTime
    savedEndTime = formData.value.endTime
  }

  const initEditor = async (id?: string | null, initialDate?: string) => {
    isInitializing.value = true

    try {
      editingEventId.value = id || (route.query.id as string | null)
      
      if (editingEventId.value) {
        const event = await eventService.fetchEventById(editingEventId.value)
        fillFormFromEvent(event)
        return
      }

      const queryDate = initialDate || (route.query.date as string | undefined)
      initForm(queryDate)
    } catch (err: any) {
      addToast(err.message || '載入活動失敗', 'error')
    } finally {
      isInitializing.value = false
    }
  }

  watch(() => formData.value.allDay, (isAllDay) => {
    if (isAllDay) {
      savedStartTime = formData.value.startTime
      savedEndTime = formData.value.endTime
      formData.value.startTime = '00:00'
      formData.value.endTime = '23:59'
    } else {
      formData.value.startTime = savedStartTime
      formData.value.endTime = savedEndTime
    }
  })

  const validateForm = (): { valid: boolean; error?: string } => {
    if (!formData.value.title.trim()) {
      return { valid: false, error: '請輸入活動名稱' }
    }

    const start = parseISO(`${formData.value.startDate}T${formData.value.startTime}`)
    const end = parseISO(`${formData.value.endDate}T${formData.value.endTime}`)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { valid: false, error: '請選擇完整的日期與時間' }
    }

    if (end <= start) {
      return { valid: false, error: '結束時間必須晚於開始時間' }
    }

    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays > 7) {
      return { valid: false, error: '活動期間不能超過 7 天' }
    }

    if (!formData.value.googleFormUrl.trim()) {
      return { valid: false, error: '請輸入 Google 表單連結' }
    }

    try {
      const url = new URL(formData.value.googleFormUrl.trim())
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { valid: false, error: 'Google 表單連結格式不正確' }
      }
    } catch {
      return { valid: false, error: 'Google 表單連結格式不正確' }
    }

    if (formData.value.registrationBonus < 0 || formData.value.checkinBonus < 0 || formData.value.raffleThreshold < 0) {
      return { valid: false, error: 'Point settings cannot be negative' }
    }

    if (formData.value.feedbackBonusPoints < 0) {
      return { valid: false, error: '回饋同步設定不可為負數' }
    }

    if (formData.value.checkinFormBonusPoints < 0) {
      return { valid: false, error: '打卡表單設定不可為負數' }
    }

    if (!['test', 'live'].includes(formData.value.feedbackVisibilityMode)) {
      return { valid: false, error: '回饋顯示模式設定不正確' }
    }

    if (!['test', 'live'].includes(formData.value.checkinVisibilityMode)) {
      return { valid: false, error: '打卡表單顯示模式設定不正確' }
    }

    if (formData.value.feedbackFormUrl.trim()) {
      try {
        const url = new URL(formData.value.feedbackFormUrl.trim())
        if (!['http:', 'https:'].includes(url.protocol)) {
          return { valid: false, error: '回饋表單連結格式不正確' }
        }
      } catch {
        return { valid: false, error: '回饋表單連結格式不正確' }
      }
    }

    if (formData.value.checkinFormUrl.trim()) {
      try {
        const url = new URL(formData.value.checkinFormUrl.trim())
        if (!['http:', 'https:'].includes(url.protocol)) {
          return { valid: false, error: '打卡表單連結格式不正確' }
        }
      } catch {
        return { valid: false, error: '打卡表單連結格式不正確' }
      }
    }

    if (formData.value.checkinFormSyncEnabled && !formData.value.checkinResponseSheetId.trim()) {
      return { valid: false, error: '啟用打卡表單同步時，請設定打卡回應試算表 ID' }
    }

    return { valid: true }
  }

  const saveEvent = async (onSuccess?: () => void) => {
    const { valid, error } = validateForm()
    if (!valid) {
      addToast(error!, 'error')
      return
    }

    isSaving.value = true

    try {
      const payload: CreateEventPayload = {
        title: formData.value.title.trim(),
        description: formData.value.description.trim() || undefined,
        location: formData.value.location.trim() || undefined,
        start_at: new Date(`${formData.value.startDate}T${formData.value.startTime}`).toISOString(),
        end_at: new Date(`${formData.value.endDate}T${formData.value.endTime}`).toISOString(),
        all_day: formData.value.allDay,
        status: formData.value.status,
        google_sheet_id: formData.value.googleSheetId.trim() || undefined,
        google_form_url: formData.value.googleFormUrl.trim(),
        feedback_form_url: formData.value.feedbackFormUrl.trim() || undefined,
        feedback_response_sheet_id: formData.value.feedbackResponseSheetId.trim() || undefined,
        feedback_bonus_points: Number(formData.value.feedbackBonusPoints) || 0,
        feedback_visibility_mode: formData.value.feedbackVisibilityMode,
        checkin_form_url: formData.value.checkinFormUrl.trim() || undefined,
        checkin_response_sheet_id: formData.value.checkinResponseSheetId.trim() || undefined,
        checkin_form_bonus_points: Number(formData.value.checkinFormBonusPoints) || 0,
        checkin_visibility_mode: formData.value.checkinVisibilityMode,
        checkin_form_sync_enabled: formData.value.checkinFormSyncEnabled,
        registration_bonus: Number(formData.value.registrationBonus) || 0,
        checkin_bonus: Number(formData.value.checkinBonus) || 0,
        raffle_threshold: Number(formData.value.raffleThreshold) || 0,
      }

      if (editingEventId.value) {
        await updateEventToDatabase(editingEventId.value, payload)
        addToast('活動已更新', 'success')
      } else {
        await createEventToDatabase(payload)
        addToast('活動已建立', 'success')
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/events')
      }
    } catch (err: any) {
      addToast(err.message || '儲存活動失敗', 'error')
    } finally {
      isSaving.value = false
    }
  }

  const deleteEvent = async (onSuccess?: () => void) => {
    if (!editingEventId.value) return

    try {
      await showDialog({
        title: '刪除活動',
        message: '確定要刪除這個活動嗎？此操作無法復原。',
        confirmButtonText: '刪除',
        cancelButtonText: '取消',
        confirmButtonColor: '#ef4444',
      })
    } catch {
      // 使用者取消
      return
    }

    isDeleting.value = true

    try {
      await eventService.deleteEvent(editingEventId.value)
      addToast('活動已刪除', 'success')
      
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/events')
      }
    } catch (err: any) {
      addToast(err.message || '刪除活動失敗', 'error')
    } finally {
      isDeleting.value = false
    }
  }

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '未選擇'
    const date = parseISO(dateStr)
    return format(date, 'yyyy/MM/dd')
  }

  const formatDisplayTime = (timeStr: string): string => timeStr || '未選擇'

  const getDateColumns = (dateStr: string): string[] => {
    if (!dateStr) return []
    return dateStr.split('-')
  }

  const getTimeColumns = (timeStr: string): string[] => {
    if (!timeStr) return []
    return timeStr.split(':')
  }

  const setPickerValue = (
    field: 'startDate' | 'startTime' | 'endDate' | 'endTime',
    values: string[],
  ) => {
    formData.value[field] = values.join(field.endsWith('Date') ? '-' : ':')
  }

  const onStartDateConfirm = (result: { selectedValues: string[] }) => {
    setPickerValue('startDate', result.selectedValues)
    showStartDatePicker.value = false
  }

  const onStartTimeConfirm = (result: { selectedValues: string[] }) => {
    setPickerValue('startTime', result.selectedValues)
    showStartTimePicker.value = false
  }

  const onEndDateConfirm = (result: { selectedValues: string[] }) => {
    setPickerValue('endDate', result.selectedValues)
    showEndDatePicker.value = false
  }

  const onEndTimeConfirm = (result: { selectedValues: string[] }) => {
    setPickerValue('endTime', result.selectedValues)
    showEndTimePicker.value = false
  }

  return {
    formData,
    bonusItems,
    isSaving,
    isDeleting,
    isInitializing,
    isEditMode,
    showStartDatePicker,
    showStartTimePicker,
    showEndDatePicker,
    showEndTimePicker,
    initForm,
    initEditor,
    validateForm,
    saveEvent,
    deleteEvent,
    formatDisplayDate,
    formatDisplayTime,
    getDateColumns,
    getTimeColumns,
    onStartDateConfirm,
    onStartTimeConfirm,
    onEndDateConfirm,
    onEndTimeConfirm,
  }
}
