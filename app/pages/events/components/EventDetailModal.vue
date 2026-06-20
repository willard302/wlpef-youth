<script setup lang="ts">
import { format } from 'date-fns'
import type { Event } from '~/types';
import { EVENT_STATUS_CLASS_MAP, EVENT_STATUS_LABEL_MAP } from '~/utils/eventStatus'

const props = defineProps<{
  show: boolean
  selectedEvent: Event | null
  canViewAllEventStatus?: boolean
  isRegistered?: boolean
  isCheckedIn?: boolean
  checkingRegistration?: boolean
}>()

const emit = defineEmits<{
  'update:show': [val: boolean]
  'register': []
}>()

const eventDetailVisible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const canViewAllEventStatus = computed(() => props.canViewAllEventStatus ?? false)
const isRegistered = computed(() => props.isRegistered ?? false)
const isCheckedIn = computed(() => props.isCheckedIn ?? false)
const checkingRegistration = computed(() => props.checkingRegistration ?? false)
const selectedEvent = computed(() => props.selectedEvent)

const selectedEventStatus = computed(() => selectedEvent.value?.status)
const selectedEventHasForm = computed(() => Boolean(selectedEvent.value?.googleFormUrl))
const selectedEventDateLabel = computed(() => {
  if (!selectedEvent.value) return ''
  return selectedEvent.value.time && selectedEvent.value.period
    ? `${selectedEvent.value.time} ${selectedEvent.value.period}`
    : format(selectedEvent.value.startAt, 'HH:mm')
})

const handleRegister = () => {
  emit('register')
}

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
  if (isCheckedIn.value) return 'bg-red-500 text-white cursor-not-allowed shadow-red-200'
  if (isRegistered.value) return 'bg-emerald-500 text-white cursor-not-allowed shadow-emerald-200'
  if (!props.selectedEvent) return 'bg-slate-200 text-slate-500 cursor-not-allowed'
  return selectedEventStatus.value === 'closed' || !selectedEventHasForm.value
    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
    : 'bg-sky-500 text-white hover:bg-sky-600 active:scale-[0.98] shadow-sky-200'
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
</script>

<template>
  <van-action-sheet v-model:show="eventDetailVisible" title="活動詳情" class="rounded-t-[2.5rem] overflow-hidden">
    <div v-if="selectedEvent" class="px-6 pb-12 pt-4 space-y-6">
      <div class="flex items-start gap-4">
        <div class="size-14 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg" :style="{ backgroundColor: '#0EA5E9' }">
          <span class="text-[10px] font-bold uppercase opacity-80">{{ format(selectedEvent.startAt, 'MMM') }}</span>
          <span class="text-xl font-black">{{ format(selectedEvent.startAt, 'd') }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-xl font-bold text-slate-900 leading-tight">{{ selectedEvent.title }}</h3>
          <div class="flex items-center gap-2 mt-1">
            <span
              v-if="canViewAllEventStatus"
              class="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wide"
              :class="EVENT_STATUS_CLASS_MAP[selectedEvent.status]"
            >
              {{ EVENT_STATUS_LABEL_MAP[selectedEvent.status] }}
            </span>
            <span class="text-xs text-slate-400 font-medium">{{ selectedEventDateLabel }}</span>
          </div>
        </div>
      </div>

      <div class="space-y-4 bg-slate-50 rounded-3xl p-5">
        <div class="flex items-start gap-3">
          <AppIcon name="location_on" class="text-sky-500" />
          <div class="flex-1">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">地點</p>
            <p class="text-sm text-slate-700 font-medium">{{ selectedEvent.location || '未指定地點' }}</p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <AppIcon name="schedule" class="text-indigo-400" />
          <div class="flex-1">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">時間</p>
            <p class="text-sm text-slate-700 font-medium">
              {{ format(selectedEvent.startAt, 'yyyy/MM/dd HH:mm') }} -
              {{ format(selectedEvent.endAt, 'HH:mm') }}
            </p>
          </div>
        </div>
      </div>

      <div v-if="selectedEvent.description" class="space-y-2 px-1">
        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">活動簡介</p>
        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{{ selectedEvent.description }}</p>
      </div>

      <div class="pt-4">
        <button
          @click="handleRegister"
          :disabled="checkingRegistration || isActionDisabled"
          class="w-full h-14 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
          :class="actionButtonClass"
        >
          <van-loading v-if="checkingRegistration" type="spinner" size="20px" color="#ffffff" />
          <template v-else>
            <AppIcon :name="actionIconName" />
            <span>{{ actionLabel }}</span>
          </template>
        </button>
        <p v-if="isCheckedIn" class="text-[10px] text-center text-slate-400 mt-2">
          * 您已完成本次活動的現場報到。
        </p>
        <p v-else-if="isRegistered" class="text-[10px] text-center text-slate-400 mt-2">
          * 點數將於一分鐘內自動發放。
        </p>
        <p v-else-if="checkingRegistration" class="text-[10px] text-center text-slate-400 mt-2">正在確認狀態...</p>
      </div>
    </div>
  </van-action-sheet>
</template>

<style scoped></style>
