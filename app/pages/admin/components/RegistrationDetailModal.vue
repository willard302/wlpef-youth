<script setup lang="ts">
import { format as fnsFormat } from 'date-fns'
import UserPointsDetailsModal from './UserPointsDetailsModal.vue'
import type { EventRegistration } from '~/types'

const props = defineProps<{
  show: boolean
  selectedRegistration: EventRegistration | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const registrationDetailVisible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const {
  currentTotalPoints,
  isPointsLoading,
  pointsDetailsVisible,
  isTransactionsLoading,
  pointTransactions,
  openPointsDetails,
} = useAdminRegistrationDetail(
  toRef(props, 'show'),
  toRef(props, 'selectedRegistration')
)
</script>

<template>
  <van-action-sheet v-model:show="registrationDetailVisible" title="報名詳細資料" class="rounded-t-[2.5rem] overflow-hidden">
    <div v-if="selectedRegistration" class="px-6 pb-12 pt-4 space-y-6 max-h-[70vh] overflow-y-auto">
      <!-- Basic Info -->
      <div class="flex items-center gap-4">
        <div class="size-14 rounded-2xl bg-sky-500 flex items-center justify-center text-white shadow-lg">
          <AppIcon name="person" size="md" />
        </div>
        <div>
          <h3 class="text-xl font-bold text-slate-900">{{ selectedRegistration.name || '未提供姓名' }}</h3>
          <p class="text-sm text-slate-500 font-medium">{{ selectedRegistration.email }}</p>
        </div>
      </div>

      <!-- Points Info -->
      <button
        type="button"
        class="w-full text-left bg-slate-50 rounded-2xl p-4"
        @click="openPointsDetails"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">目前總點數</p>
            <p class="text-sm font-bold text-slate-700">
              {{ isPointsLoading ? '載入中...' : currentTotalPoints === null ? '無法取得' : `${currentTotalPoints} 點` }}
            </p>
          </div>
          <AppIcon name="chevron_right" :size="18" class="text-slate-400" />
        </div>
      </button>

      <!-- Payment Info -->
      <div class="bg-slate-50 rounded-2xl p-4 space-y-3">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">繳費狀態</p>
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-2xl bg-white px-4 py-3 border border-slate-200">
            <p class="text-[10px] font-bold text-slate-400 mb-1">年度捐贈</p>
            <p class="text-sm font-bold" :class="selectedRegistration.donationYear ? 'text-emerald-600' : 'text-slate-500'">
              {{ selectedRegistration.donationYear ? '已完成' : '未完成' }}
            </p>
          </div>
          <div class="rounded-2xl bg-white px-4 py-3 border border-slate-200">
            <p class="text-[10px] font-bold text-slate-400 mb-1">活動報名費</p>
            <p class="text-sm font-bold" :class="selectedRegistration.registrationFee ? 'text-emerald-600' : 'text-slate-500'">
              {{ selectedRegistration.registrationFee ? '已完成' : '未完成' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Raw Data (Google Form Fields) -->
      <div v-if="selectedRegistration.rawData && Object.keys(selectedRegistration.rawData).length > 0" class="space-y-4">
        <div class="flex items-center gap-2 px-1">
          <span class="w-1 h-4 bg-sky-500 rounded-full"></span>
          <h4 class="text-sm font-bold text-slate-800 uppercase tracking-wider">報名資訊</h4>
        </div>
        
        <div class="bg-slate-50 rounded-3xl p-5 space-y-4">
          <div 
            v-for="(value, key) in selectedRegistration.rawData" 
            :key="key"
            class="border-b border-slate-200/50 last:border-0 pb-3 last:pb-0"
          >
            <p class="text-[10px] font-bold text-slate-400 mb-1">{{ key }}</p>
            <p class="text-sm text-slate-700 font-medium break-words">{{ value || '(未填寫)' }}</p>
          </div>
        </div>
      </div>

      <!-- Meta -->
      <div class="text-[10px] text-center text-slate-400 space-y-1">
        <p>報名時間：{{ fnsFormat(selectedRegistration.formSubmittedAt, 'yyyy/MM/dd HH:mm:ss') }}</p>
        <p v-if="selectedRegistration.googleSheetRowId">同步標記：{{ selectedRegistration.googleSheetRowId }}</p>
      </div>
    </div>
  </van-action-sheet>

  <UserPointsDetailsModal
    v-model:show="pointsDetailsVisible"
    :is-loading="isTransactionsLoading"
    :user-name="selectedRegistration?.name"
    :transactions="pointTransactions"
  />
</template>

<style scoped></style>
