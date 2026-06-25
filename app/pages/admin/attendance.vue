<script setup lang="ts">
import { format as fnsFormat } from 'date-fns'
import { eventAdminService } from '~/services/eventAdmin'
import type { Event, EventCheckin } from '~/types'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const { addToast } = useToast()

const isLoading = ref(false)
const isEventsLoading = ref(false)
const events = ref<Event[]>([])
const attendance = ref<EventCheckin[]>([])
const searchQuery = ref('')
const selectedEvent = ref<Event | null>(null)
const showEventPicker = ref(false)

const selectedAttendance = ref<EventCheckin | null>(null)
const showAttendanceDetail = ref(false)

const openAttendanceDetail = (item: EventCheckin) => {
  selectedAttendance.value = item
  showAttendanceDetail.value = true
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
  try {
    attendance.value = await eventAdminService.fetchAttendanceByEventId(event.id)
  } catch (err: any) {
    addToast(err.message || '載入出席名單失敗', 'error')
    attendance.value = []
  } finally {
    isLoading.value = false
  }
}

const eventPickerActions = computed(() => {
  return events.value.map(event => ({
    name: event.title,
    subname: `${fnsFormat(event.startAt, 'yyyy/MM/dd')} (${event.status})`,
    callback: () => selectEvent(event)
  }))
})

const filteredAttendance = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()

  if (!keyword) {
    return attendance.value
  }

  return attendance.value.filter((item) => {
    return (
      item.userName?.toLowerCase().includes(keyword) ||
      item.email.toLowerCase().includes(keyword) ||
      item.checkinMethod?.toLowerCase().includes(keyword)
    )
  })
})

onMounted(async () => {
  await loadEvents()
})
</script>

<template>
  <div class="attendance-page pb-24 min-h-screen bg-slate-50">
    <AppHeaderPage title="活動出席狀況" />

    <main class="px-4 -mt-6 relative z-20 space-y-6">
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
            <AppIcon name="swap_horiz" :size="18" />
          </button>
        </div>
      </section>

      <!-- Stats Summary -->
      <div v-if="selectedEvent && !isLoading" class="grid grid-cols-2 gap-4">
        <div class="stat-card">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">總出席人數</p>
          <div class="flex items-end justify-between">
            <p class="text-2xl font-black text-slate-800">{{ attendance.length }}</p>
            <AppIcon name="verified" class="text-emerald-500" />
          </div>
        </div>
        <div class="stat-card">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">完成報名且報到</p>
          <p class="text-2xl font-black text-emerald-500">100%</p>
        </div>
      </div>

      <!-- Attendance List -->
      <section class="space-y-4">
        <div class="flex items-center justify-between px-2">
          <h4 class="text-sm font-bold text-slate-500 uppercase tracking-widest">出席名單</h4>
          <div class="flex items-center gap-3 text-[11px] font-bold text-slate-400">
            <span v-if="!isLoading && attendance.length > 0">
              {{ filteredAttendance.length }} / {{ attendance.length }}
            </span>
            <span v-if="isLoading" class="size-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></span>
          </div>
        </div>

        <div class="relative">
          <AppIcon name="search" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋姓名、Email..."
            class="search-input"
          />
        </div>

        <van-loading v-if="isLoading" type="spinner" vertical>載入名單中...</van-loading>

        <div v-else-if="attendance.length === 0" class="bg-white/50 border-2 border-dashed border-slate-200 rounded-[2rem] py-12 flex flex-col items-center justify-center text-center">
          <AppIcon name="person_off" :size="36" class="text-slate-200 mb-2" />
          <p class="text-slate-400 text-sm font-medium">尚無出席資料</p>
        </div>

        <div v-else-if="filteredAttendance.length === 0" class="bg-white/50 border-2 border-dashed border-slate-200 rounded-[2rem] py-12 flex flex-col items-center justify-center text-center">
          <AppIcon name="search_off" :size="36" class="text-slate-200 mb-2" />
          <p class="text-slate-400 text-sm font-medium">查無符合條件的出席資料</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="item in filteredAttendance"
            :key="item.id"
            @click="openAttendanceDetail(item)"
            class="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <div class="flex justify-between items-start">
              <div class="flex items-center gap-3">
                <div class="size-10 rounded-full bg-slate-100 overflow-hidden">
                  <img v-if="item.userAvatar" :src="item.userAvatar" class="size-full object-cover" />
                  <div v-else class="size-full flex items-center justify-center text-slate-400">
                    <AppIcon name="person" size="sm" />
                  </div>
                </div>
                <div>
                  <h5 class="font-bold text-slate-900 text-base mb-0.5">{{ item.userName || '未提供姓名' }}</h5>
                  <p class="text-xs text-slate-400 font-medium">{{ item.email }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  {{ fnsFormat(item.checkedInAt, 'MM/dd HH:mm') }}
                </p>
                <span class="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-bold border border-emerald-100 mt-1">
                  已報到
                </span>
              </div>
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

    <!-- Attendance Detail Modal -->
    <van-action-sheet v-model:show="showAttendanceDetail" title="出席詳細資料" class="rounded-t-[2.5rem] overflow-hidden">
      <div v-if="selectedAttendance" class="px-6 pb-12 pt-4 space-y-6">
        <div class="flex items-center gap-4">
          <div class="size-16 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg overflow-hidden">
            <img v-if="selectedAttendance.userAvatar" :src="selectedAttendance.userAvatar" class="size-full object-cover" />
            <AppIcon name="person" :size="30" />
          </div>
          <div>
            <h3 class="text-xl font-bold text-slate-900">{{ selectedAttendance.userName || '未提供姓名' }}</h3>
            <p class="text-sm text-slate-500 font-medium">{{ selectedAttendance.email }}</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="bg-slate-50 rounded-2xl p-4">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">報到方式</p>
            <p class="text-sm font-bold text-slate-700">{{ selectedAttendance.checkinMethod === 'qr_code' ? 'QR Code 掃描' : '手動報到' }}</p>
          </div>
          <div class="bg-slate-50 rounded-2xl p-4">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">點數狀態</p>
            <p class="text-sm font-bold text-emerald-600">{{ selectedAttendance.checkinPointsGrantedAt ? '已發放' : '處理中' }}</p>
          </div>
        </div>

        <div class="bg-slate-50 rounded-2xl p-4">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">報到時間</p>
          <p class="text-sm font-bold text-slate-700">{{ fnsFormat(selectedAttendance.checkedInAt, 'yyyy/MM/dd HH:mm:ss') }}</p>
        </div>

        <div class="pt-2">
          <div class="flex items-center gap-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-700">
            <AppIcon name="verified" />
            <p class="text-xs font-bold">該成員已完成活動報名與現場報到</p>
          </div>
        </div>
      </div>
    </van-action-sheet>
  </div>
</template>

<style scoped>
.attendance-page {
  background-color: #f8fafc;
}
</style>
