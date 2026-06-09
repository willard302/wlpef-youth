<script setup lang="ts">
import { userService } from '@/services/userService'
import { format as fnsFormat } from 'date-fns'
import { getPointTransactionMeta } from '@/config/pointTransactions'
import type { PointTransaction } from '@/types'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
  showTabbar: true,
  tabbarKey: 'events',
})

const transactions = ref<PointTransaction[]>([])
const isLoading = ref(true)

const fetchTransactions = async () => {
  try {
    isLoading.value = true
    transactions.value = await userService.fetchPointTransactions()
  } catch (error) {
    console.error('Failed to fetch transactions', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchTransactions()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <AppHeaderPage title="點數紀錄" />

    <main class="px-4 py-6 max-w-md mx-auto space-y-4">
      <div v-if="isLoading" class="flex flex-col items-center py-20 text-slate-400">
        <div class="size-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-sm font-bold tracking-widest">載入中...</p>
      </div>

      <div v-else-if="transactions.length === 0" class="flex flex-col items-center py-20 text-slate-400 text-center">
        <span class="material-symbols-outlined text-6xl opacity-20 mb-4">history_toggle_off</span>
        <p class="font-medium">尚無點數紀錄</p>
      </div>

      <div v-else class="space-y-3">
        <div 
          v-for="tx in transactions" 
          :key="tx.id"
          class="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-4"
        >
          <div :class="['size-12 rounded-2xl flex items-center justify-center', getPointTransactionMeta(tx.type).colorClass]">
            <span class="material-symbols-outlined">{{ getPointTransactionMeta(tx.type).icon }}</span>
          </div>
          
          <div class="flex-1 min-w-0">
            <h4 class="font-bold text-slate-900 truncate">{{ tx.eventTitle || getPointTransactionMeta(tx.type).label }}</h4>
            <p class="text-xs text-slate-400 mt-1">{{ fnsFormat(new Date(tx.createdAt), 'yyyy/MM/dd HH:mm') }}</p>
            <p v-if="tx.description" class="text-[11px] text-slate-500 mt-1 line-clamp-1">{{ tx.description }}</p>
          </div>

          <div class="text-right min-w-[60px]">
            <span :class="['text-lg font-black', tx.points >= 0 ? 'text-emerald-500' : 'text-red-500']">
              {{ tx.points >= 0 ? '+' : '' }}{{ tx.points }}
            </span>
            <p class="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">PTS</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>
