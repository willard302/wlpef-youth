<script setup lang="ts">
import { format } from 'date-fns'
import type { EventModalProps } from '~/types';
import { EVENT_STATUS_CLASS_MAP, EVENT_STATUS_LABEL_MAP } from '~/utils/eventStatus'

const props = defineProps<EventModalProps>()

const emit = defineEmits<{
  'update:show': [val: boolean]
  'register': []
  'feedback': []
  'checkin-form': []
}>()

const {
  eventDetailVisible,
  selectedEvent,
  selectedEventDateLabel,
  actionLabel,
  actionIconName,
  actionButtonClass,
  feedbackButtonClass,
  checkinFormButtonClass,
  isActionDisabled,
  canShowFeedbackAction,
  canShowCheckinFormAction,
  canViewAllEventStatus,
  isRegistered,
  isCheckedIn,
  isFeedbackSubmitted,
  isCheckinFormSubmitted,
  checkingRegistration,
  handleRegister,
  handleFeedback,
  handleCheckinForm,
} = useEventModal(props, emit)

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

        <button
          v-if="canShowFeedbackAction"
          @click="handleFeedback"
          :disabled="isFeedbackSubmitted"
          class="mt-3 w-full h-14 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
          :class="feedbackButtonClass"
        >
          <AppIcon :name="isFeedbackSubmitted ? 'check_circle' : 'edit_note'" />
          <span>{{ isFeedbackSubmitted ? '已完成回饋問卷' : '前往回饋問卷' }}</span>
        </button>

        <button
          v-if="canShowCheckinFormAction"
          @click="handleCheckinForm"
          :disabled="isCheckinFormSubmitted"
          class="mt-3 w-full h-14 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
          :class="checkinFormButtonClass"
        >
          <AppIcon :name="isCheckinFormSubmitted ? 'check_circle' : 'playlist_add_check'" />
          <span>{{ isCheckinFormSubmitted ? '已完成打卡表單' : '前往打卡表單' }}</span>
        </button>
      </div>
    </div>
  </van-action-sheet>
</template>

<style scoped></style>
