<script setup lang="ts">
import { format as fnsFormat } from 'date-fns'
import { eventAdminService } from '~/services/eventAdmin.js'
import type { Event, EventRegistration } from '~/types'
import RegistrationDetailModal from './components/RegistrationDetailModal.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
  showTabbar: false,
})

const { addToast } = useToast()

const isLoading = ref(false)
const isEventsLoading = ref(false)
const events = ref<Event[]>([])
const registrations = ref<EventRegistration[]>([])
const searchQuery = ref('')
const selectedEvent = ref<Event | null>(null)
const showEventPicker = ref(false)
const isSyncing = ref(false)
const currentPage = ref(1)
const itemsPerPage = 15

const selectedRegistration = ref<EventRegistration | null>(null)
const registrationDetailVisible = ref(false)

const openRegistrationDetail = (reg: EventRegistration) => {
  selectedRegistration.value = reg
  registrationDetailVisible.value = true
}

const loadEvents = async () => {
  isEventsLoading.value = true
  try {
    events.value = await eventAdminService.fetchAllEventsForAdmin()
    if (events.value.length > 0) {
      // Default to the most recent event
      await selectEvent(events.value[0]!!)
    }
  } catch (err: any) {
    addToast(err.message || '載入活動列表失敗', 'error')
  } finally {
    isEventsLoading.value = false
  }
}

const selectEvent = async (event: Event) => {
  selectedEvent.value = event
  showEventPicker.value = false
  isLoading.value = true
  currentPage.value = 1
  try {
    registrations.value = await eventAdminService.fetchRegistrationsByEventId(event.id)
  } catch (err: any) {
    addToast(err.message || '載入報名名單失敗', 'error')
    registrations.value = []
  } finally {
    isLoading.value = false
  }
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
    // Reload registrations
    await selectEvent(selectedEvent.value)
  } catch (err: any) {
    console.error('Sync error:', err)
    addToast(err.message || '同步失敗，請檢查設定', 'error')
  } finally {
    isSyncing.value = false
  }
}

const eventPickerActions = computed(() => {
  return events.value.map(event => ({
    name: event.title,
    subname: `${fnsFormat(event.startAt, 'yyyy/MM/dd')} (${event.status})`,
    callback: () => selectEvent(event)
  }))
})

const getPointsStatus = (reg: EventRegistration) => {
  return reg.registrationPointsGrantedAt ? '點數已發放' : '處理中'
}

const filteredRegistrations = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()

  if (!keyword) {
    return registrations.value
  }

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

// Reset to page 1 when searching
watch(searchQuery, () => {
  currentPage.value = 1
})

onMounted(async () => {
  await loadEvents()
})
</script>

<template>
  <div class="registrations-page pb-24 min-h-screen bg-slate-50">
    <AppHeaderPage title="活動報名狀況" />

    <main class="px-4 -mt-6 relative z-20 space-y-6 pb-24">
      <!-- Event Selector -->
      <section class="white-glass-card p-5 mt-8">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">目前檢視活動</p>
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-bold text-slate-800 truncate">
              {{ selectedEvent?.title || (isEventsLoading ? '載入中...' : '尚未選擇活動') }}
            </h3>
          </div>
          <button
            @click="showEventPicker = true"
            class="px-4 py-2 rounded-xl bg-sky-50 text-sky-600 text-xs font-bold hover:bg-sky-100 transition-all flex items-center gap-2"
          >
            <AppIcon name="swap_horiz" :size="14" />
            切換活動
          </button>
        </div>
      </section>

      <!-- Stats Summary -->
      <div v-if="selectedEvent && !isLoading" class="grid grid-cols-2 gap-4">
        <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm relative group">
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
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Google 同步</p>
          <p class="text-2xl font-black text-sky-500">
            {{ registrations.filter(r => !!r.googleSheetRowId).length }}
          </p>
        </div>
      </div>

      <!-- Registration List -->
      <section class="space-y-4">
        <div class="flex items-center justify-between px-2">
          <h4 class="text-sm font-bold text-slate-500 uppercase tracking-widest">報名名單</h4>
          <div class="flex items-center gap-3 text-[11px] font-bold text-slate-400">
            <span v-if="!isLoading && registrations.length > 0">
              {{ filteredRegistrations.length }} / {{ registrations.length }}
            </span>
            <span v-if="isLoading" class="size-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></span>
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

        <div v-if="isLoading" class="flex flex-col items-center py-12 text-slate-400">
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

    <!-- Event Picker -->
    <van-action-sheet
      v-model:show="showEventPicker"
      :actions="eventPickerActions"
      title="選擇活動"
      cancel-text="取消"
      close-on-click-action
      class="rounded-t-[2.5rem]"
    />

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
