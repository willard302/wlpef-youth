<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { format as fnsFormat } from 'date-fns'
import { eventService } from '@/services/eventService'
import type { Event, EventRegistration } from '@/types'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
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

const getSyncStatus = (reg: EventRegistration) => {
  return reg.googleSheetRowId ? 'Google 同步' : '站內報名'
}

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
    <AppHeroHeader
      eyebrow="管理後台"
      title="活動報名狀況"
      height-class="h-48"
      show-back
    >
    </AppHeroHeader>

    <main class="px-4 -mt-6 relative z-20 space-y-6">
      <!-- Event Selector -->
      <section class="bg-white/95 backdrop-blur-xl rounded-3xl p-5 shadow-xl border border-white">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">目前檢視活動</p>
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
            class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
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
                :class="reg.googleSheetRowId ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-sky-50 text-sky-600 border border-sky-100'"
              >
                {{ getSyncStatus(reg) }}
              </span>
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
  </div>
</template>

<style scoped>
.registrations-page {
  background-color: #f8fafc;
}
</style>
