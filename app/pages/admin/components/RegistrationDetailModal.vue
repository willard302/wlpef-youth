<script setup lang="ts">
import { format as fnsFormat } from 'date-fns'
import type { EventRegistration } from '@/types'

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

const getPointsStatus = (reg: EventRegistration) => {
  return reg.registrationPointsGrantedAt ? '點數已發放' : '處理中'
}
</script>

<template>
  <van-action-sheet v-model:show="registrationDetailVisible" title="報名詳細資料" class="rounded-t-[2.5rem] overflow-hidden">
    <div v-if="selectedRegistration" class="px-6 pb-12 pt-4 space-y-6 max-h-[70vh] overflow-y-auto">
      <!-- Basic Info -->
      <div class="flex items-center gap-4">
        <div class="size-14 rounded-2xl bg-sky-500 flex items-center justify-center text-white shadow-lg">
          <AppIcon size="md">person</AppIcon>
        </div>
        <div>
          <h3 class="text-xl font-bold text-slate-900">{{ selectedRegistration.name || '未提供姓名' }}</h3>
          <p class="text-sm text-slate-500 font-medium">{{ selectedRegistration.email }}</p>
        </div>
      </div>

      <!-- Points Info -->
      <div class="bg-slate-50 rounded-2xl p-4">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">點數狀態</p>
        <p class="text-sm font-bold text-slate-700">{{ getPointsStatus(selectedRegistration) }}</p>
      </div>

      <!-- Raw Data (Google Form Fields) -->
      <div v-if="selectedRegistration.rawData && Object.keys(selectedRegistration.rawData).length > 0" class="space-y-4">
        <div class="flex items-center gap-2 px-1">
          <span class="w-1 h-4 bg-sky-500 rounded-full"></span>
          <h4 class="text-sm font-bold text-slate-800 uppercase tracking-wider">表單完整欄位</h4>
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
</template>

<style scoped></style>
