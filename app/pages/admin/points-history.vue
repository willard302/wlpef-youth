<script setup lang="ts">
import { getPointTransactionMeta } from '@/config/pointTransactions'
import { userService } from '@/services/userService'
import { format as fnsFormat } from 'date-fns'
import type { PointTransaction } from '@/types'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
  showTabbar: false,
})

const router = useRouter()
const transactions = ref<PointTransaction[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const detailsDialogOpen = ref(false)
const selectedTransaction = ref<PointTransaction | null>(null)

const fetchTransactions = async () => {
  try {
    isLoading.value = true
    transactions.value = await userService.fetchAllPointTransactions()
  } catch (error) {
    console.error('Failed to fetch transactions', error)
  } finally {
    isLoading.value = false
  }
}

const filteredTransactions = computed(() => {
  if (!searchQuery.value) return transactions.value
  const query = searchQuery.value.toLowerCase()
  return transactions.value.filter(tx => 
    tx.userName?.toLowerCase().includes(query) || 
    tx.userEmail?.toLowerCase().includes(query) ||
    tx.eventTitle?.toLowerCase().includes(query) ||
    tx.description?.toLowerCase().includes(query)
  )
})

const openDetails = (tx: PointTransaction) => {
  selectedTransaction.value = tx
  detailsDialogOpen.value = true
}

const closeDetails = () => {
  detailsDialogOpen.value = false
  selectedTransaction.value = null
}

onMounted(() => {
  fetchTransactions()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20">
    <AppHeaderPage title="點數紀錄" />

    <main class="px-4 py-6 max-w-md mx-auto space-y-6">
      <!-- Search Bar -->
      <div class="relative">
        <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="搜尋姓名、Email 或活動..."
          class="w-full h-12 pl-12 pr-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-primary/50 outline-none text-sm"
        />
      </div>

      <div v-if="isLoading" class="flex flex-col items-center py-20 text-slate-400">
        <div class="size-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-sm font-bold tracking-widest">載入中...</p>
      </div>

      <div v-else-if="filteredTransactions.length === 0" class="flex flex-col items-center py-20 text-slate-400 text-center">
        <span class="material-symbols-outlined text-6xl opacity-20 mb-4">history_toggle_off</span>
        <p class="font-medium">找不到相關紀錄</p>
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="tx in filteredTransactions" 
          :key="tx.id"
          class="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4 cursor-pointer active:scale-[0.99] transition-transform"
          @click="openDetails(tx)"
        >
          <!-- User Info Header -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-50">
            <div class="flex items-center gap-2">
              <div class="size-8 rounded-full bg-slate-100 flex items-center justify-center">
                <span class="material-symbols-outlined text-sm text-slate-400">person</span>
              </div>
              <div>
                <p class="text-sm font-black text-slate-900 leading-none">{{ tx.userName || '未知用戶' }}</p>
                <p class="text-[10px] text-slate-400 mt-1">{{ tx.userEmail }}</p>
              </div>
            </div>
            <div class="text-right">
              <span :class="['text-lg font-black', tx.points >= 0 ? 'text-emerald-500' : 'text-red-500']">
                {{ tx.points >= 0 ? '+' : '' }}{{ tx.points }}
              </span>
              <p class="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">PTS</p>
            </div>
          </div>

          <p class="text-[11px] text-slate-400">點擊查看交易明細</p>
        </div>
      </div>

      <div
        v-if="detailsDialogOpen && selectedTransaction"
        class="fixed inset-0 z-50 bg-slate-900/45 p-4 flex items-end sm:items-center justify-center"
        @click.self="closeDetails"
      >
        <div class="w-full max-w-md bg-white rounded-3xl p-5 shadow-xl space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-black text-slate-900">交易明細</h3>
            <button
              type="button"
              class="size-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
              @click="closeDetails"
            >
              <span class="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <div class="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
            <div :class="['size-10 rounded-xl flex items-center justify-center shrink-0', getPointTransactionMeta(selectedTransaction.type).colorClass]">
              <span class="material-symbols-outlined text-xl">{{ getPointTransactionMeta(selectedTransaction.type).icon }}</span>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-bold text-slate-900 truncate">{{ selectedTransaction.eventTitle || getPointTransactionMeta(selectedTransaction.type).label }}</p>
              <p class="text-[11px] text-slate-500 mt-0.5">{{ fnsFormat(new Date(selectedTransaction.createdAt), 'yyyy/MM/dd HH:mm') }}</p>
            </div>
          </div>

          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between text-slate-600">
              <span>姓名</span>
              <span class="font-semibold text-slate-900">{{ selectedTransaction.userName || '未知用戶' }}</span>
            </div>
            <div class="flex items-center justify-between text-slate-600 gap-3">
              <span>Email</span>
              <span class="font-semibold text-slate-900 truncate">{{ selectedTransaction.userEmail || '-' }}</span>
            </div>
            <div class="flex items-center justify-between text-slate-600">
              <span>點數</span>
              <span :class="['font-black', selectedTransaction.points >= 0 ? 'text-emerald-500' : 'text-red-500']">
                {{ selectedTransaction.points >= 0 ? '+' : '' }}{{ selectedTransaction.points }}
              </span>
            </div>
          </div>

          <div v-if="selectedTransaction.description" class="bg-slate-50 p-3 rounded-xl">
            <p class="text-[12px] text-slate-700 leading-relaxed">{{ selectedTransaction.description }}</p>
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
