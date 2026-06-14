<script setup lang="ts">
import { userService } from '@/services/userService'
import type { PointTransaction } from '@/types'
import PointsTransactionDetailsModal from './components/PointsTransactionDetailsModal.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
  showTabbar: false,
})

const transactions = ref<PointTransaction[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const detailsDialogOpen = ref(false)
const selectedTransaction = ref<PointTransaction | null>(null)
const currentPage = ref(1)
const itemsPerPage = 20

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

const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredTransactions.value.slice(start, end)
})

const openDetails = (tx: PointTransaction) => {
  selectedTransaction.value = tx
  detailsDialogOpen.value = true
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
          v-for="tx in paginatedTransactions" 
          :key="tx.id"
          class="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4 cursor-pointer active:scale-[0.99] transition-transform"
          @click="openDetails(tx)"
        >
          <!-- User Info Header -->
          <div class="flex items-center justify-between">
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
            </div>
          </div>

        </div>

        <div v-if="filteredTransactions.length > itemsPerPage" class="pt-4 pb-8">
          <van-pagination 
            v-model="currentPage"
            :total-items="filteredTransactions.length"
            :items-per-page="itemsPerPage"
            force-ellipses
            class="custom-pagination"
          />
        </div>
      </div>

      <!-- Points Transaction Details Dialog -->
      <PointsTransactionDetailsModal 
        v-model:show="detailsDialogOpen"
        :transaction="selectedTransaction"
      />

    </main>
  </div>
</template>

<style scoped>
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>
