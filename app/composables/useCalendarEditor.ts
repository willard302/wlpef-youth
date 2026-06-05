import { addHours, format, parseISO, set } from 'date-fns'
import { showDialog } from 'vant'
import type { CreateEventPayload, Event } from '@/types'
import { eventService } from '@/services/eventService'

export const COLOR_OPTIONS = [
  '#2b9dee',
  '#14b8a6',
  '#8b5cf6',
  '#f43f5e',
  '#f59e0b',
  '#64748b',
] as const

export function useCalendarEditor() {
  const router = useRouter()
  const route = useRoute()
  const { addToast } = useToast()

  const isSaving = ref(false)
  const isDeleting = ref(false)
  const isInitializing = ref(false)

  const editingEventId = computed(() => {
    const queryId = route.query.id
    return typeof queryId === 'string' && queryId.length > 0 ? queryId : null
  })
  const isEditMode = computed(() => editingEventId.value !== null)

  const formData = ref({
    title: '',
    description: '',
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    allDay: false,
    color: COLOR_OPTIONS[0] as string,
    status: 'draft' as CreateEventPayload['status'],
    googleSheetId: '',
    googleFormUrl: '',
    targetId: '',
    subdomain: '',
    registrationBonus: 0,
    checkinBonus: 0,
    socialLeaderboard: false,
    raffleThreshold: 0,
  })

  let savedStartTime = '14:00'
  let savedEndTime = '15:30'

  const initForm = (dateStr?: string) => {
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
    formData.value.title = event.title
    formData.value.description = event.description
    formData.value.location = event.location
    formData.value.startDate = format(event.startAt, 'yyyy-MM-dd')
    formData.value.startTime = format(event.startAt, 'HH:mm')
    formData.value.endDate = format(event.endAt, 'yyyy-MM-dd')
    formData.value.endTime = format(event.endAt, 'HH:mm')
    formData.value.allDay = event.allDay
    formData.value.color = event.color || COLOR_OPTIONS[0]
    formData.value.status = event.status
    formData.value.googleSheetId = event.googleSheetId || ''
    formData.value.googleFormUrl = event.googleFormUrl || ''
    formData.value.targetId = event.targetId || ''
    formData.value.subdomain = event.subdomain || ''
    formData.value.registrationBonus = event.registrationBonus
    formData.value.checkinBonus = event.checkinBonus
    formData.value.socialLeaderboard = event.socialLeaderboard
    formData.value.raffleThreshold = event.raffleThreshold
    savedStartTime = formData.value.startTime
    savedEndTime = formData.value.endTime
  }

  const initEditor = async () => {
    isInitializing.value = true

    try {
      if (editingEventId.value) {
        const event = await eventService.fetchEventById(editingEventId.value)
        fillFormFromEvent(event)
        return
      }

      const queryDate = route.query.date
      initForm(typeof queryDate === 'string' ? queryDate : undefined)
    } catch (err: any) {
      addToast(err.message || '載入活動失敗', 'error')
      router.replace('/home')
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

    return { valid: true }
  }

  const saveEvent = async () => {
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
        color: formData.value.color,
        status: formData.value.status,
        google_sheet_id: formData.value.googleSheetId.trim() || undefined,
        google_form_url: formData.value.googleFormUrl.trim(),
        target_id: formData.value.targetId.trim() || undefined,
        subdomain: formData.value.subdomain.trim() || undefined,
        registration_bonus: Number(formData.value.registrationBonus) || 0,
        checkin_bonus: Number(formData.value.checkinBonus) || 0,
        social_leaderboard: formData.value.socialLeaderboard,
        raffle_threshold: Number(formData.value.raffleThreshold) || 0,
      }

      if (editingEventId.value) {
        await eventService.updateEvent(editingEventId.value, payload)
        addToast('活動已更新', 'success')
      } else {
        await eventService.createEvent(payload)
        addToast('活動已建立', 'success')
      }

      router.push('/home')
    } catch (err: any) {
      addToast(err.message || '儲存活動失敗', 'error')
    } finally {
      isSaving.value = false
    }
  }

  const deleteEvent = async () => {
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
      router.push('/home')
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

  return {
    formData,
    isSaving,
    isDeleting,
    isInitializing,
    isEditMode,
    COLOR_OPTIONS,
    initForm,
    initEditor,
    validateForm,
    saveEvent,
    deleteEvent,
    formatDisplayDate,
    formatDisplayTime,
  }
}
