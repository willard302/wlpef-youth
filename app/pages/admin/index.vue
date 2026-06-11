<script setup lang="ts">
import { format as fnsFormat } from 'date-fns'
import { eventService } from '@/services/eventService'
import type { Event } from '@/types'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
  showTabbar: false,
  tabbarKey: 'home'
})

const { openMenu } = useSideMenu()
const { addToast } = useToast()

const isLoading = ref(true)
const events = ref<Event[]>([])
const selectedEvent = ref<Event | null>(null)
const showEventPicker = ref(false)
const showPointsBreakdown = ref(false)

const stats = ref({
  totalProfiles: 0,
  eventRegistrations: 0,
  eventCheckins: 0,
  totalPoints: 0,
  pointsBreakdown: { registration: 0, checkin: 0 }
})

const loadEvents = async () => {
  try {
    const data = await eventService.fetchAllEventsForAdmin()
    events.value = data
    if (data.length > 0 && !selectedEvent.value) {
      selectedEvent.value = data[0]!!
    }
  } catch (err: any) {
    addToast('載入活動列表失敗', 'error')
  }
}

const loadDashboardStats = async () => {
  if (!selectedEvent.value) return
  
  isLoading.value = true
  try {
    const data = await eventService.fetchAdminDashboardStats(selectedEvent.value.id)
    stats.value = data
  } catch (err: any) {
    addToast('載入統計數據失敗', 'error')
  } finally {
    isLoading.value = false
  }
}

const selectEvent = (event: Event) => {
  selectedEvent.value = event
  showEventPicker.value = false
  loadDashboardStats()
}

const eventPickerActions = computed(() => {
  return events.value.map(event => ({
    name: event.title,
    subname: fnsFormat(event.startAt, 'yyyy/MM/dd'),
    callback: () => selectEvent(event)
  }))
})

const displayStats = computed(() => [
  { 
    id: 'profiles',
    label: '完成註冊人數', 
    value: stats.value.totalProfiles.toString(), 
    icon: 'person_check', 
    color: 'text-blue-500', 
    bg: 'bg-blue-50' 
  },
  { 
    id: 'registrations',
    label: '報名人數', 
    value: stats.value.eventRegistrations.toString(), 
    icon: 'how_to_reg', 
    color: 'text-indigo-500', 
    bg: 'bg-indigo-50' 
  },
  { 
    id: 'checkins',
    label: '報到人數', 
    value: stats.value.eventCheckins.toString(), 
    icon: 'check_circle', 
    color: 'text-emerald-500', 
    bg: 'bg-emerald-50' 
  },
  { 
    id: 'points',
    label: '點數發放', 
    value: stats.value.totalPoints >= 1000 ? `${(stats.value.totalPoints / 1000).toFixed(1)}k` : stats.value.totalPoints.toString(), 
    icon: 'database', 
    color: 'text-amber-500', 
    bg: 'bg-amber-50',
    clickable: true
  },
])

const quickActions = [
  { label: '新增活動', icon: 'add_circle', path: '/admin/event-editor', color: 'bg-sky-500' },
  { label: '報名管理', icon: 'assignment_ind', path: '/admin/registrations', color: 'bg-indigo-500' },
  { label: '活動簽到', icon: 'qr_code_scanner', path: '/admin/checkin', color: 'bg-emerald-500' },
  { label: '會員管理', icon: 'group', path: '/admin/members', color: 'bg-violet-500' },
  { label: '點數紀錄', icon: 'history', path: '/admin/points-history', color: 'bg-amber-500' },
]

onMounted(async () => {
  await loadEvents()
  await loadDashboardStats()
})
</script>

<template>
  <div class="admin-dashboard pb-24">
    <AppHeaderHero
      eyebrow="管理後台"
      title="管理中心"
      height-class="h-56"
    >
      <template #actions>
        <button
          @click="openMenu"
          class="size-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-all"
        >
          <span class="material-symbols-outlined text-2xl">menu</span>
        </button>
      </template>

      <!-- Event Selector Trigger -->
      <div class="mt-4 flex flex-col gap-1">
        <p class="text-sky-100 text-[10px] font-bold uppercase tracking-widest opacity-80">正在檢視活動</p>
        <button
          @click="showEventPicker = true"
          class="flex items-center gap-2 text-left group"
        >
          <h2 class="text-white text-xl font-bold truncate max-w-[280px]">
            {{ selectedEvent?.title || '載入活動中...' }}
          </h2>
          <span class="material-symbols-outlined text-white/60 group-hover:text-white transition-colors">swap_horiz</span>
        </button>
      </div>
    </AppHeaderHero>

    <main class="px-4 -mt-8 relative z-20 space-y-6">
      <!-- Quick Stats Grid -->
      <section class="grid grid-cols-2 gap-4">
        <div 
          v-for="stat in displayStats" 
          :key="stat.id"
          class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-3 transition-all active:scale-[0.98]"
          :class="{ 'cursor-pointer hover:border-primary/30': stat.clickable }"
          @click="stat.clickable && (showPointsBreakdown = true)"
        >
          <div :class="[stat.bg, stat.color, 'size-10 rounded-2xl flex items-center justify-center']">
            <span class="material-symbols-outlined text-2xl">{{ stat.icon }}</span>
          </div>
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ stat.label }}</p>
            <div class="flex items-baseline gap-1">
              <p class="text-2xl font-black text-slate-800">{{ isLoading ? '...' : stat.value }}</p>
              <span v-if="stat.id === 'points' && !isLoading" class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">PTS</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="space-y-4">
        <h3 class="px-2 text-sm font-bold text-slate-500 uppercase tracking-widest">快速功能</h3>
        <div class="grid grid-cols-3 gap-y-6 gap-x-2">
          <NuxtLink
            v-for="action in quickActions"
            :key="action.label"
            :to="action.path"
            class="flex flex-col items-center gap-2"
          >
            <div :class="[action.color, 'size-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-100 active:scale-95 transition-transform']">
              <span class="material-symbols-outlined text-2xl">{{ action.icon }}</span>
            </div>
            <span class="text-[10px] font-bold text-slate-600">{{ action.label }}</span>
          </NuxtLink>
        </div>
      </section>

      <!-- Recent System Logs Placeholder -->
      <section class="space-y-4">
        <div class="flex items-center justify-between px-2">
          <h3 class="text-sm font-bold text-slate-500 uppercase tracking-widest">活動狀態</h3>
        </div>
        <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6">
          <div class="flex items-center gap-4">
            <div class="flex-1 space-y-1">
              <p class="text-xs font-bold text-slate-400 uppercase">活動時間</p>
              <p class="text-sm font-bold text-slate-700">
                {{ selectedEvent ? fnsFormat(selectedEvent.startAt, 'yyyy/MM/dd HH:mm') : '...' }}
              </p>
            </div>
            <div class="text-right space-y-1">
              <p class="text-xs font-bold text-slate-400 uppercase">狀態</p>
              <span 
                v-if="selectedEvent"
                class="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border"
                :class="{
                  'bg-emerald-50 text-emerald-600 border-emerald-100': selectedEvent.status === 'published',
                  'bg-amber-50 text-amber-600 border-amber-100': selectedEvent.status === 'draft',
                  'bg-slate-50 text-slate-600 border-slate-100': selectedEvent.status === 'closed'
                }"
              >
                {{ selectedEvent.status === 'published' ? '已發佈' : (selectedEvent.status === 'draft' ? '草稿' : '已關閉') }}
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
      title="切換統計活動"
      cancel-text="取消"
      close-on-click-action
    />

    <!-- Points Breakdown Modal -->
    <van-action-sheet v-model:show="showPointsBreakdown" title="點數發放詳情" class="rounded-t-[2.5rem]">
      <div class="px-6 pb-12 pt-6 space-y-6">
        <div class="text-center space-y-1">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">活動總發放</p>
          <p class="text-4xl font-black text-amber-500 tracking-tighter">{{ stats.totalPoints }} <span class="text-sm font-bold text-slate-400">PTS</span></p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="bg-slate-50 rounded-3xl p-5 space-y-2">
            <div class="size-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <span class="material-symbols-outlined text-lg">how_to_reg</span>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">報名獎勵</p>
              <p class="text-xl font-black text-slate-800">{{ stats.pointsBreakdown.registration }}</p>
            </div>
          </div>
          <div class="bg-slate-50 rounded-3xl p-5 space-y-2">
            <div class="size-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <span class="material-symbols-outlined text-lg">check_circle</span>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">簽到獎勵</p>
              <p class="text-xl font-black text-slate-800">{{ stats.pointsBreakdown.checkin }}</p>
            </div>
          </div>
        </div>

        <p class="text-[10px] text-center text-slate-400 font-medium">
          * 僅顯示該活動（ID: {{ selectedEvent?.id.substring(0, 8) }}...）相關的點數發放
        </p>
      </div>
    </van-action-sheet>
  </div>
</template>

<style scoped>
.admin-dashboard {
  background-color: #f8fafc;
  min-height: 100vh;
}
</style>
