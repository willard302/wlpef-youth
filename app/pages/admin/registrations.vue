<script setup lang="ts">
import { format as fnsFormat } from 'date-fns'
import { eventService } from '@/services/eventService'
import type { Event, EventRegistration } from '@/types'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
  showTabbar: false,
})

const router = useRouter()
const { addToast } = useToast()
const { userProfile, loadUserData } = useUser()

const isLoading = ref(false)
const isEventsLoading = ref(false)
const events = ref<Event[]>([])
const registrations = ref<EventRegistration[]>([])
const selectedEvent = ref<Event | null>(null)
const showEventPicker = ref(false)
const isSyncing = ref(false)

const selectedRegistration = ref<EventRegistration | null>(null)
const showRegistrationDetail = ref(false)

const openRegistrationDetail = (reg: EventRegistration) => {
  selectedRegistration.value = reg
  showRegistrationDetail.value = true
}

const loadEvents = async () => {
  isEventsLoading.value = true
  try {
    events.value = await eventService.fetchAllEventsForAdmin()
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
  try {
    registrations.value = await eventService.fetchRegistrationsByEventId(event.id)
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
    const result = await eventService.syncGoogleSheet(
      selectedEvent.value.id,
      selectedEvent.value.googleSheetId
    )
    addToast(`同步完成！匯入 ${result.importedCount} 筆，比對成功 ${result.matchedCount} 筆`, 'success')
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

onMounted(async () => {
  await loadUserData()
  if (userProfile.value?.role !== 'admin') {
    addToast('權限不足', 'error')
    router.replace('/home')
    return
  }
  await loadEvents()
})
</script>

<template>
  <div class="registrations-page pb-24 min-h-screen bg-slate-50">
    <AppHeaderPage title="活動報名狀況" />

    <main class="px-4 -mt-6 relative z-20 space-y-6">
      <!-- Event Selector -->
      <section class="bg-white/95 backdrop-blur-xl rounded-3xl p-5 mt-8 shadow-xl border border-white">
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
            <span class="material-symbols-outlined text-sm">swap_horiz</span>
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
              <span class="material-symbols-outlined text-lg" :class="{ 'animate-spin': isSyncing }">
                {{ isSyncing ? 'sync' : 'sync_saved_locally' }}
              </span>
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
          <span v-if="isLoading" class="size-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></span>
        </div>

        <div v-if="isLoading" class="flex flex-col items-center py-12 text-slate-400">
          <p class="text-xs font-bold tracking-widest">載入名單中...</p>
        </div>

        <div v-else-if="registrations.length === 0" class="bg-white/50 border-2 border-dashed border-slate-200 rounded-[2rem] py-12 flex flex-col items-center justify-center text-center">
          <span class="material-symbols-outlined text-4xl text-slate-200 mb-2">group_off</span>
          <p class="text-slate-400 text-sm font-medium">尚無報名資料</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="reg in registrations"
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
    <van-action-sheet v-model:show="showRegistrationDetail" title="報名詳細資料" class="rounded-t-[2.5rem] overflow-hidden">
      <div v-if="selectedRegistration" class="px-6 pb-12 pt-4 space-y-6 max-h-[70vh] overflow-y-auto">
        <!-- Basic Info -->
        <div class="flex items-center gap-4">
          <div class="size-14 rounded-full bg-sky-500 flex items-center justify-center text-white shadow-lg">
            <span class="material-symbols-outlined text-2xl">person</span>
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
  </div>
</template>

<style scoped>
.registrations-page {
  background-color: #f8fafc;
}
</style>
