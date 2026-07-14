import { format, parseISO } from 'date-fns'
import { eventService } from '~/services/event'
import { eventAdminService } from '~/services/eventAdmin'
import {
  createDefaultEventFormData,
  createDefaultEventFormDataForDate,
  eventRowToFormData,
} from '~/utils/eventFormMapper'
import type { CreateEventPayload, EventFormData, EventRow } from '~/types'

type BonusField = 'registration_bonus' | 'checkin_bonus' | 'raffle_threshold'

export const useEventForm = () => {
  const router = useRouter()
  const route = useRoute()
  const { addToast } = useToast()

  const isSaving = ref(false)
  const isDeleting = ref(false)
  const isInitializing = ref(false)
  const showStartDatePicker = ref(false)
  const showStartTimePicker = ref(false)
  const showEndDatePicker = ref(false)
  const showEndTimePicker = ref(false)

  const editingEventId = ref<string | null>(null)
  const isEditMode = computed(() => editingEventId.value !== null)
  let savedStartTime = '14:00'
  let savedEndTime = '15:30'

  const formData = ref<EventFormData>(createDefaultEventFormData())

  const bonusItems: Array<{ label: string; icon: string; field: BonusField }> = [
    { label: '報名獎勵點數', icon: 'how_to_reg', field: 'registration_bonus' },
    { label: '簽到獎勵點數', icon: 'fact_check', field: 'checkin_bonus' },
    { label: '抽獎門檻（點數）', icon: 'trophy', field: 'raffle_threshold' },
  ]

  const initForm = (dateStr?: string) => {
    formData.value = createDefaultEventFormDataForDate(dateStr)

    savedStartTime = formData.value.start_time
    savedEndTime = formData.value.end_time
  }

  const fillFormFromEvent = (event: EventRow) => {
    formData.value = eventRowToFormData(event)

    savedStartTime = formData.value.start_time
    savedEndTime = formData.value.end_time
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

  watch(() => formData.value.all_day, (isAllDay) => {
    if (isAllDay) {
      savedStartTime = formData.value.start_time
      savedEndTime = formData.value.end_time
      formData.value.start_time = '00:00'
      formData.value.end_time = '23:59'
    } else {
      formData.value.start_time = savedStartTime
      formData.value.end_time = savedEndTime
    }
  })

  const validateForm = (): { valid: boolean; error?: string } => {
    if (!formData.value.title.trim()) {
      return { valid: false, error: '請輸入活動名稱' }
    }

    const start = parseISO(`${formData.value.start_date}T${formData.value.start_time}`)
    const end = parseISO(`${formData.value.end_date}T${formData.value.end_time}`)

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

    if (!formData.value.google_form_url?.trim()) {
      return { valid: false, error: '請輸入 Google 表單連結' }
    }

    try {
      const url = new URL(formData.value.google_form_url.trim())
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { valid: false, error: 'Google 表單連結格式不正確' }
      }
    } catch {
      return { valid: false, error: 'Google 表單連結格式不正確' }
    }

    if (formData.value.registration_bonus! < 0 || formData.value.checkin_bonus! < 0 || formData.value.raffle_threshold! < 0) {
      return { valid: false, error: 'Point settings cannot be negative' }
    }

    if (formData.value.feedback_bonus_points! < 0) {
      return { valid: false, error: '回饋同步設定不可為負數' }
    }

    if (formData.value.checkin_form_bonus_points! < 0) {
      return { valid: false, error: '打卡表單設定不可為負數' }
    }

    if (!['test', 'live'].includes(formData.value.feedback_visibility_mode!)) {
      return { valid: false, error: '回饋顯示模式設定不正確' }
    }

    if (!['test', 'live'].includes(formData.value.checkin_visibility_mode!)) {
      return { valid: false, error: '打卡表單顯示模式設定不正確' }
    }

    if (formData.value.feedback_form_url?.trim()) {
      try {
        const url = new URL(formData.value.feedback_form_url.trim())
        if (!['http:', 'https:'].includes(url.protocol)) {
          return { valid: false, error: '回饋表單連結格式不正確' }
        }
      } catch {
        return { valid: false, error: '回饋表單連結格式不正確' }
      }
    }

    if (formData.value.checkin_form_url?.trim()) {
      try {
        const url = new URL(formData.value.checkin_form_url.trim())
        if (!['http:', 'https:'].includes(url.protocol)) {
          return { valid: false, error: '打卡表單連結格式不正確' }
        }
      } catch {
        return { valid: false, error: '打卡表單連結格式不正確' }
      }
    }

    if (formData.value.checkin_form_sync_enabled && !formData.value.checkin_response_sheet_id?.trim()) {
      return { valid: false, error: '啟用打卡表單同步時，請設定打卡回應試算表 ID' }
    }

    return { valid: true }
  }

  const buildSavePayload = (): CreateEventPayload => {
    const data = formData.value

    return {
      title: data.title.trim(),
      description: data.description?.trim() || undefined,
      location: data.location?.trim() || undefined,
      start_at: new Date(`${data.start_date}T${data.start_time}`).toISOString(),
      end_at: new Date(`${data.end_date}T${data.end_time}`).toISOString(),
      all_day: data.all_day,
      status: data.status,
      google_sheet_id: data.google_sheet_id?.trim() || undefined,
      google_form_url: data.google_form_url?.trim(),
      feedback_form_url: data.feedback_form_url?.trim() || undefined,
      feedback_response_sheet_id: data.feedback_response_sheet_id?.trim() || undefined,
      feedback_bonus_points: Number(data.feedback_bonus_points) || 0,
      feedback_visibility_mode: data.feedback_visibility_mode,
      checkin_form_url: data.checkin_form_url?.trim() || undefined,
      checkin_response_sheet_id: data.checkin_response_sheet_id?.trim() || undefined,
      checkin_form_bonus_points: Number(data.checkin_form_bonus_points) || 0,
      checkin_visibility_mode: data.checkin_visibility_mode,
      checkin_form_sync_enabled: data.checkin_form_sync_enabled,
      registration_bonus: Number(data.registration_bonus) || 0,
      checkin_bonus: Number(data.checkin_bonus) || 0,
      raffle_threshold: Number(data.raffle_threshold) || 0,
    }
  }

  const getBonusFieldValue = (field: BonusField) => {
    switch (field) {
      case 'registration_bonus':
        return formData.value.registration_bonus ?? 0
      case 'checkin_bonus':
        return formData.value.checkin_bonus ?? 0
      case 'raffle_threshold':
        return formData.value.raffle_threshold ?? 0
    }
  }

  const setBonusFieldValue = (field: BonusField, value: string | number) => {
    const nextValue = Number(value) || 0

    switch (field) {
      case 'registration_bonus':
        formData.value.registration_bonus = nextValue
        break
      case 'checkin_bonus':
        formData.value.checkin_bonus = nextValue
        break
      case 'raffle_threshold':
        formData.value.raffle_threshold = nextValue
        break
    }
  }

  const saveEvent = async (onSuccess?: () => void) => {
    const { valid, error } = validateForm()
    if (!valid) {
      addToast(error!, 'error')
      return
    }

    isSaving.value = true

    try {
      const payload = buildSavePayload()

      if (editingEventId.value) {
        await eventAdminService.updateEvent(editingEventId.value, payload)
        addToast('活動已更新', 'success')
      } else {
        await eventAdminService.insertEvent(payload)
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
    field: 'start_date' | 'start_time' | 'end_date' | 'end_time',
    values: string[],
  ) => {
    formData.value[field] = values.join(field.endsWith('_date') ? '-' : ':')
  }

  const onStartDateConfirm = (result: { selectedValues: string[] }) => {
    setPickerValue('start_date', result.selectedValues)
    showStartDatePicker.value = false
  }

  const onStartTimeConfirm = (result: { selectedValues: string[] }) => {
    setPickerValue('start_time', result.selectedValues)
    showStartTimePicker.value = false
  }

  const onEndDateConfirm = (result: { selectedValues: string[] }) => {
    setPickerValue('end_date', result.selectedValues)
    showEndDatePicker.value = false
  }

  const onEndTimeConfirm = (result: { selectedValues: string[] }) => {
    setPickerValue('end_time', result.selectedValues)
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
    getBonusFieldValue,
    setBonusFieldValue,
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
