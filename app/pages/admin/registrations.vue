<script setup lang="ts">
import type { Event, EventRegistration } from '~/types'
import { format as fnsFormat } from 'date-fns'
import { eventAdminService } from '~/services/eventAdmin.js'
import RegistrationDetailModal from './components/RegistrationDetailModal.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const { addToast } = useToast()
const { selectedEvent, registrations, isPickerLoading, changeEvent } = useAdminEventPicker()

const searchQuery = ref('')
const isSyncing = ref(false)
const currentPage = ref(1)
const itemsPerPage = 15

const selectedRegistration = ref<EventRegistration | null>(null)
const registrationDetailVisible = ref(false)

const openRegistrationDetail = (reg: EventRegistration) => {
  selectedRegistration.value = reg
  registrationDetailVisible.value = true
}

const handleEventChange = async(event: Event) => {
  currentPage.value = 1
  await changeEvent(event)
}

const handleSync = async () => {
  if (!selectedEvent.value?.googleSheetId) {
    addToast('此活動未設定 Google 試算表 ID', 'error')
    return
  }

  isSyncing.value = true
  try {
    const { results } = await eventAdminService.syncGoogleSheet(
      selectedEvent.value.id,
      selectedEvent.value.googleSheetId
    )
    
    addToast(`同步完成！匯入 ${results[0].importedCount} 筆，比對成功 ${results[0].matchedCount} 筆`, 'success')

    if (!selectedEvent.value) return
    await changeEvent(selectedEvent.value)
  } catch (err: any) {
    console.error('Sync error:', err)
    addToast(err.message || '同步失敗，請檢查設定', 'error')
  } finally {
    isSyncing.value = false
  }
}

const getPointsStatus = (reg: EventRegistration) => {
  return reg.registrationPointsGrantedAt ? '點數已發放' : '處理中'
}

const getFirstLoginStatus = (reg: EventRegistration) => {
  return reg.firstLoginEnabled ? '已啟用' : '未啟用'
}

const filteredRegistrations = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  if (!keyword) return registrations.value

  return registrations.value.filter((reg) => {
    const searchableValues = [
      reg.name,
      reg.email,
      reg.googleSheetRowId,
      ...Object.entries(reg.rawData ?? {}).flatMap(([key, value]) => [key, String(value ?? '')]),
    ]
    return searchableValues.some(value => value?.toLowerCase().includes(keyword))
  })
})

const paginatedRegistrations = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredRegistrations.value.slice(start, end)
})

const enabledCount = computed(() => registrations.value.filter(reg => reg.firstLoginEnabled).length)
const disabledCount = computed(() => registrations.value.length - enabledCount.value)

watch(searchQuery, () => {
  currentPage.value = 1
})
</script>

<template>
  <div class="registrations-page pb-24 min-h-screen bg-slate-50">
    <AppHeaderPage title="活動報名狀況" />

    <main class="px-4 -mt-6 relative z-20 space-y-3 pb-24">
      <AdminEventPicker 
        v-model="selectedEvent"
        @change="handleEventChange"
      />

      <!-- Stats Summary -->
      <div v-if="selectedEvent && !isPickerLoading" class="grid grid-cols-[1.6fr_1fr_1fr] gap-4">
        <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">總報名人數</p>
          <div class="flex items-end justify-between">
            <p class="text-2xl font-black text-slate-800">{{ registrations.length }}</p>
            <button
              @click="handleSync"
              :disabled="isSyncing || !selectedEvent.googleSheetId"
              class="size-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="立即同步 Google 試算表"
            >
              <AppIcon :name="isSyncing ? 'sync' : 'sync_saved_locally'" :size="18" :class="{ 'animate-spin': isSyncing }" />
            </button>
          </div>
        </div>
        <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">已啟用</p>
          <div class="flex items-end justify-between">
            <p class="text-2xl font-black text-emerald-600">{{ enabledCount }}</p>
            <span class="size-8 invisible"></span>
          </div>
        </div>
        <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">未啟用</p>
          <div class="flex items-end justify-between">
            <p class="text-2xl font-black text-slate-600">{{ disabledCount }}</p>
            <span class="size-8 invisible"></span>
          </div>
        </div>
      </div>

      <!-- Registration List -->
      <section class="space-y-4">
        <div class="flex items-center justify-between px-2">
          <h4 class="text-sm font-bold text-slate-500 uppercase tracking-widest">報名名單</h4>
          <div class="flex items-center gap-3 text-[11px] font-bold text-slate-400">
            <span v-if="!isPickerLoading && registrations.length > 0">
              {{ filteredRegistrations.length }} / {{ registrations.length }}
            </span>
            <span v-if="isPickerLoading" class="size-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></span>
          </div>
        </div>

        <div class="relative">
          <AppIcon name="search" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋姓名、Email、表單欄位..."
            class="w-full h-12 pl-12 pr-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-primary/50 outline-none text-sm"
          />
        </div>

        <div v-if="isPickerLoading" class="flex flex-col items-center py-12 text-slate-400">
          <p class="text-xs font-bold tracking-widest">載入名單中...</p>
        </div>

        <div v-else-if="registrations.length === 0" class="bg-white/50 border-2 border-dashed border-slate-200 rounded-[2rem] py-12 flex flex-col items-center justify-center text-center">
          <AppIcon name="group_off" :size="36" class="text-slate-200 mb-2" />
          <p class="text-slate-400 text-sm font-medium">尚無報名資料</p>
        </div>

        <div v-else-if="filteredRegistrations.length === 0" class="bg-white/50 border-2 border-dashed border-slate-200 rounded-[2rem] py-12 flex flex-col items-center justify-center text-center">
          <AppIcon name="search_off" :size="36" class="text-slate-200 mb-2" />
          <p class="text-slate-400 text-sm font-medium">查無符合條件的報名資料</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="reg in paginatedRegistrations"
            :key="reg.id"
            @click="openRegistrationDetail(reg)"
            class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <div class="flex justify-between items-start mb-3">
              <div>
                <h5 class="font-bold text-slate-900 text-base mb-0.5">{{ reg.name || '未提供姓名' }}</h5>
                <p class="text-xs text-slate-400 font-medium">{{ reg.email }}</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  {{ fnsFormat(reg.formSubmittedAt, 'MM/dd HH:mm') }}
                </p>
              </div>
            </div>
            
            <div class="flex flex-wrap gap-2">
              <span
                class="px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wide"
                :class="reg.registrationPointsGrantedAt ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-50 text-slate-500 border border-slate-100'"
              >
                {{ getPointsStatus(reg) }}
              </span>
              <span
                class="px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wide"
                :class="reg.firstLoginEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-500 border border-slate-100'"
              >
                {{ getFirstLoginStatus(reg) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="filteredRegistrations.length > itemsPerPage" class="pt-4 pb-8">
          <van-pagination
            v-model="currentPage"
            :total-items="filteredRegistrations.length"
            :items-per-page="itemsPerPage"
            force-ellipses
            class="custom-pagination"
          >
            <template #prev-text>
              <AppIcon name="chevron_left" :size="16" />
            </template>
            <template #next-text>
              <AppIcon name="chevron_right" :size="16" />
            </template>
          </van-pagination>
        </div>
      </section>
    </main>

    <!-- Registration Detail Modal -->
    <RegistrationDetailModal 
      v-model:show="registrationDetailVisible"
      :selectedRegistration="selectedRegistration"
    />
  </div>
</template>

<style scoped>
.registrations-page {
  background-color: #f8fafc;
}

:deep(.custom-pagination) {
  --van-pagination-item-default-color: #64748b;
  --van-pagination-item-active-background: #0ea5e9;
  --van-pagination-item-active-color: #ffffff;
  --van-pagination-height: 44px;
}

:deep(.van-pagination__item) {
  border-radius: 12px;
  margin: 0 2px;
  border: none;
  background: white;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  font-weight: 600;
  font-size: 13px;
}

:deep(.van-pagination__item--active) {
  background: #0ea5e9;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);
}
</style>
