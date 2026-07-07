<script setup lang="ts">
import { format as fnsFormat } from 'date-fns'
import { getPointTransactionMeta } from '~/config/pointTransactions'
import type { PointTransaction } from '~/types'

const props = defineProps<{
  show: boolean
  isLoading: boolean
  userName?: string | null
  transactions: PointTransaction[]
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const visible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})
</script>

<template>
  <van-action-sheet v-model:show="visible" title="點數明細" class="rounded-t-[2.5rem] overflow-hidden">
    <div class="px-6 pb-10 pt-4 space-y-4 max-h-[70vh] overflow-y-auto">
      <p class="text-xs text-slate-500 font-medium">
        {{ props.userName || '此會員' }} 的點數異動紀錄
      </p>

      <div v-if="isLoading" class="py-10 text-center text-slate-400 text-sm font-medium">
        載入明細中...
      </div>

      <div v-else-if="transactions.length === 0" class="py-10 text-center text-slate-400 text-sm font-medium">
        尚無點數異動紀錄
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="tx in transactions"
          :key="tx.id"
          class="bg-slate-50 rounded-2xl p-4 border border-slate-100"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-bold text-slate-800 truncate">
                {{ tx.eventTitle || getPointTransactionMeta(tx.type).label }}
              </p>
              <p class="text-[11px] text-slate-500 mt-1">
                {{ fnsFormat(new Date(tx.createdAt), 'yyyy/MM/dd HH:mm') }}
              </p>
            </div>
            <p :class="['text-base font-black shrink-0', tx.points >= 0 ? 'text-emerald-600' : 'text-red-500']">
              {{ tx.points >= 0 ? '+' : '' }}{{ tx.points }}
            </p>
          </div>

          <p class="text-[11px] font-bold text-slate-400 mt-2">
            {{ getPointTransactionMeta(tx.type).label }}
          </p>

          <p v-if="tx.description" class="text-xs text-slate-600 mt-1 break-words">
            {{ tx.description }}
          </p>
        </div>
      </div>
    </div>
  </van-action-sheet>
</template>

<style scoped></style>