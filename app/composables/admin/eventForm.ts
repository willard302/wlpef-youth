import { format, parseISO } from 'date-fns'
import { eventService } from '~/services/event'
import { eventAdminService } from '~/services/eventAdmin'
import {
  createDefaultEventFormData,
  createDefaultEventFormDataForDate,
  eventFormDataToCreatePayload,
  eventRowToFormData,
} from '~/utils/eventFormMapper'
import type { EventFormData, EventRow } from '~/types'

type BonusField = 'registrationBonus' | 'checkinBonus' | 'raffleThreshold'

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
    { label: '報名獎勵點數', icon: 'how_to_reg', field: 'registrationBonus' },
    { label: '簽到獎勵點數', icon: 'fact_check', field: 'checkinBonus' },
    { label: '抽獎門檻（點數）', icon: 'trophy', field: 'raffleThreshold' },
  ]

  const initForm = (dateStr?: string) => {
    formData.value = createDefaultEventFormDataForDate(dateStr)

    savedStartTime = formData.value.startTime
    savedEndTime = formData.value.endTime
  }

  const fillFormFromEvent = (event: EventRow) => {
    formData.value = eventRowToFormData(event)

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
      const payload = eventFormDataToCreatePayload(formData.value)

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
