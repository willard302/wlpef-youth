<script setup lang="ts">
import { getPointTransactionMeta } from '@/config/pointTransactions'
import { format as fnsFormat } from 'date-fns'
import type { PointTransaction } from '~/types'

const props = defineProps<{
  show: boolean
  transaction: PointTransaction | null
}>()

const emit = defineEmits<{
  'update:show': [val: boolean]
}>()

const visible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})
</script>

<template>
  <van-action-sheet
    v-model:show="visible"
    class="!bg-transparent"
    :overlay-style="{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }"
  >
    <div v-if="transaction" class="w-full max-w-md mx-auto bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-xl space-y-5">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-black text-slate-900">交易明細</h3>
        <button
          type="button"
          class="size-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center active:scale-95 transition-transform"
          @click="visible = false"
        >
          <AppIcon name="close" size="sm" />
        </button>
      </div>

      <!-- Transaction Type & Date -->
      <div class="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
        <div :class="['size-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm', getPointTransactionMeta(transaction.type).colorClass]">
          <AppIcon :name="getPointTransactionMeta(transaction.type).icon" size="md" />
        </div>
        <div class="min-w-0">
          <p class="text-base font-bold text-slate-900 truncate">{{ transaction.eventTitle || getPointTransactionMeta(transaction.type).label }}</p>
          <p class="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <AppIcon name="calendar_today" :size="14" />
            {{ fnsFormat(new Date(transaction.createdAt), 'yyyy/MM/dd HH:mm') }}
          </p>
        </div>
      </div>

      <!-- User & Points Info -->
      <div class="space-y-3 bg-white border border-slate-100 rounded-2xl p-4">
        <div class="flex items-center justify-between text-sm">
          <span class="text-slate-500">相關用戶</span>
          <div class="text-right">
            <p class="font-bold text-slate-900">{{ transaction.userName || '未知用戶' }}</p>
            <p class="text-[11px] text-slate-400 mt-0.5">{{ transaction.userEmail || '-' }}</p>
          </div>
        </div>
        
        <div class="h-px bg-slate-100 w-full"></div>

        <div class="flex items-center justify-between text-sm">
          <span class="text-slate-500">交易類型</span>
          <span class="font-semibold text-slate-700">{{ getPointTransactionMeta(transaction.type).label }}</span>
        </div>

        <div class="h-px bg-slate-100 w-full"></div>

        <div class="flex items-center justify-between text-sm">
          <span class="text-slate-500">點數變動</span>
          <span :class="['text-lg font-black', transaction.points >= 0 ? 'text-emerald-500' : 'text-red-500']">
            {{ transaction.points >= 0 ? '+' : '' }}{{ transaction.points }}
          </span>
        </div>
      </div>

      <!-- Description -->
      <div v-if="transaction.description" class="space-y-2">
        <p class="text-xs font-bold text-slate-400 px-1 uppercase tracking-wider">備註說明</p>
        <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <p class="text-sm text-slate-600 leading-relaxed italic">"{{ transaction.description }}"</p>
        </div>
      </div>

      <!-- Transaction ID (Optional/Technical) -->
      <div class="pt-2 text-center">
        <p class="text-[10px] text-slate-300 font-mono">ID: {{ transaction.id }}</p>
      </div>
    </div>
  </van-action-sheet>
</template>

<style scoped></style>
