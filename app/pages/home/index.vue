<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { format as fnsFormat } from 'date-fns'
import { eventService } from '@/services/eventService'
import type { Event } from '@/types'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const router = useRouter()
const { addToast } = useToast()
const menuVisible = ref(false)

const { userProfile, loadUserData, isLoading: isUserLoading } = useUser()
const {
  selectedDate,
  monthYear,
  calendarGrid,
  isToday,
  isSelected,
  isCurrentMonth,
  selectDate,
  previousMonth,
  nextMonth,
  goToToday,
  eventsForSelectedDate,
  eventsInMonth,
  format,
  loadEvents,
  loadCurrentUserRole,
  isCalendarLoading,
  canAddEvent,
  canEditEvent,
  canDeleteEvent,
} = useCalendar()

const isEventLoading = ref(false)
const upcomingEventData = ref<Event | null>(null)
const upcomingEventDisplay = computed(() => {
  if (!upcomingEventData.value) return { title: '敬請期待下次活動', meta: '新增活動後會顯示在這裡' }
  return {
    id: upcomingEventData.value.id,
    title: upcomingEventData.value.title,
    meta: `${fnsFormat(upcomingEventData.value.startAt, 'MM/dd HH:mm')}，${upcomingEventData.value.location || '待定地點'}`,
  }
})

// Event Detail Modal State
const eventDetailVisible = ref(false)
const selectedEvent = ref<Event | null>(null)
const isRegistered = ref(false)
const checkingRegistration = ref(false)
const registering = ref(false)

const announcements = ref([
  {
    id: '1',
    category: '公告',
    title: '歡迎使用社團管理系統',
    date: '2026.05.30',
    time: '20:00',
    content: '行事曆已串接後端資料，可以新增、編輯與刪除活動。',
  },
])

const isLoading = computed(() => isUserLoading.value || isCalendarLoading.value)

const STATUS_LABEL_MAP = {
  draft: '草稿',
  published: '已發佈',
  closed: '已關閉',
} as const

const STATUS_CLASS_MAP = {
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
} as const

const loadUpcomingEvent = async () => {
  isEventLoading.value = true

  try {
    const events = await eventService.fetchUpcomingEvents(5)
    const visibleEvents = canAddEvent.value
      ? events
      : events.filter(event => event.status === 'published')

    upcomingEventData.value = visibleEvents[0] || null
  } catch (error) {
    console.error('Failed to load upcoming event', error)
  } finally {
    isEventLoading.value = false
  }
}

const navigateToEditor = () => {
  router.push({ path: '/home/calendar-editor', query: { date: fnsFormat(selectedDate.value, 'yyyy-MM-dd') } })
}

const navigateToEditEvent = (eventId: string) => {
  router.push({ path: '/home/calendar-editor', query: { id: eventId } })
}

const handleDeleteEvent = async (eventId: string) => {
  if (!window.confirm('確定要刪除這個活動嗎？')) return

  try {
    await eventService.deleteEvent(eventId)
    addToast('活動已刪除', 'success')
    await Promise.all([loadEvents(), loadUpcomingEvent()])
  } catch (err: any) {
    addToast(err.message || '刪除活動失敗', 'error')
  }
}

const openEventDetail = async (event: Event) => {
  if (!event) return
  selectedEvent.value = event
  eventDetailVisible.value = true
  isRegistered.value = false
  checkingRegistration.value = true
  
  try {
    isRegistered.value = await eventService.checkRegistrationStatus(event.id)
  } catch (err) {
    console.error('Check registration error:', err)
  } finally {
    checkingRegistration.value = false
  }
}

const handleRegister = async () => {
  if (!selectedEvent.value || isRegistered.value) return

  try {
    registering.value = true
    await eventService.registerForEvent(selectedEvent.value.id)
    isRegistered.value = true
    addToast('報名成功！', 'success')
    // Refresh events to update attendee count
    await loadEvents()
  } catch (err: any) {
    addToast(err.message || '報名失敗，請稍後再試', 'error')
  } finally {
    registering.value = false
  }
}

const viewAllAnnouncements = () => {
  addToast('公告列表尚未開放', 'info')
}

onMounted(async () => {
  await loadUserData()
  await loadCurrentUserRole()
  await Promise.all([loadEvents(), loadUpcomingEvent()])
})
</script>

<template>
  <div class="dashboard-page pb-24">
    <AppHeroHeader
      eyebrow="領袖會社青團"
      :title="`哈囉，${userProfile?.name ?? '使用者'}`"
    >
      <template #actions>
        <button
          @click="menuVisible = true"
          class="size-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-all"
        >
          <span class="material-symbols-outlined text-2xl">menu</span>
        </button>
      </template>

      <p class="text-sky-100 text-xs font-bold uppercase tracking-widest mb-1 opacity-80">UPCOMING EVENT</p>
      <div v-if="isEventLoading" class="animate-pulse space-y-2">
        <div class="h-8 w-3/4 bg-white/20 rounded-lg"></div>
        <div class="h-4 w-1/2 bg-white/10 rounded-lg"></div>
      </div>
      <button
        v-else
        class="space-y-1 text-left"
        :disabled="!upcomingEventData"
        @click="upcomingEventData && openEventDetail(upcomingEventData)"
      >
        <h1 class="text-2xl font-extrabold leading-tight text-white drop-shadow-sm">{{ upcomingEventDisplay.title }}</h1>
        <p class="text-sky-50 text-sm font-medium opacity-90">{{ upcomingEventDisplay.meta }}</p>
      </button>
    </AppHeroHeader>

    <main class="px-4 -mt-10 relative z-20 space-y-6">
      <section class="bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-xl border border-white">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-2">
            <button @click="previousMonth" class="size-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-100 transition-colors">
              <span class="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <h3 class="text-lg font-bold text-slate-800 min-w-[120px] text-center">{{ monthYear }}</h3>
            <button @click="nextMonth" class="size-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-100 transition-colors">
              <span class="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
          <button @click="goToToday" class="px-4 py-1.5 rounded-full bg-sky-500 text-white text-[11px] font-bold hover:bg-sky-600 transition-all shadow-lg shadow-sky-200">
            今天
          </button>
        </div>

        <div class="calendar-grid text-center mb-4">
          <div v-for="dayName in ['一', '二', '三', '四', '五', '六', '日']" :key="dayName" class="text-[10px] font-bold text-slate-400 uppercase">
            {{ dayName }}
          </div>
        </div>

        <div class="calendar-grid gap-y-2">
          <div
            v-for="day in calendarGrid"
            :key="day.toISOString()"
            class="aspect-square flex items-center justify-center relative cursor-pointer group"
            @click="selectDate(day)"
          >
            <div
              class="size-10 flex items-center justify-center rounded-2xl transition-all duration-300 relative z-10"
              :class="{
                'bg-sky-500 text-white shadow-lg shadow-sky-200 ring-4 ring-sky-50': isSelected(day),
                'bg-sky-100 text-sky-700': isToday(day) && !isSelected(day),
                'text-slate-300': !isCurrentMonth(day),
                'text-slate-700 hover:bg-slate-50': isCurrentMonth(day) && !isSelected(day) && !isToday(day),
              }"
            >
              <span class="text-sm font-bold">{{ format(day, 'd') }}</span>
            </div>
            <div
              v-if="eventsInMonth.get(day.getDate()) && isCurrentMonth(day) && !isSelected(day)"
              class="absolute bottom-1.5 size-1.5 bg-sky-400 rounded-full ring-2 ring-white z-20"
            ></div>
          </div>
        </div>
      </section>

      <section class="space-y-4">
        <div class="flex items-center justify-between px-2">
          <h4 class="text-sm font-bold text-slate-500 uppercase tracking-widest">
            {{ format(selectedDate, 'M/d') }} 活動
          </h4>
          <button
            v-if="canAddEvent"
            @click="navigateToEditor"
            class="flex items-center gap-1.5 text-[11px] font-bold text-sky-500 bg-sky-50 px-3 py-1.5 rounded-full hover:bg-sky-100 transition-all"
          >
            <span class="material-symbols-outlined text-sm">add_circle</span>
            新增活動
          </button>
        </div>

        <div v-if="isCalendarLoading || isLoading" class="flex flex-col items-center py-12 text-slate-400">
          <div class="size-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p class="text-xs font-bold tracking-widest">載入活動中...</p>
        </div>

        <div v-else-if="eventsForSelectedDate.length === 0" class="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[2rem] py-12 flex flex-col items-center justify-center text-center">
          <span class="material-symbols-outlined text-4xl text-slate-200 mb-2">event_busy</span>
          <p class="text-slate-400 text-sm font-medium">這天還沒有活動</p>
        </div>

        <div v-else class="grid gap-4">
          <div
            v-for="event in eventsForSelectedDate"
            :key="event.id"
            @click="openEventDetail(event)"
            class="group bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden cursor-pointer active:scale-[0.98]"
          >
            <div class="absolute top-0 left-0 w-1.5 h-full" :style="{ backgroundColor: event.color || '#0EA5E9' }"></div>
            <div class="flex items-start gap-4">
              <div class="flex flex-col items-center min-w-[50px] pt-1">
                <span class="text-lg font-black text-slate-800 leading-none">{{ event.time }}</span>
                <span v-if="!event.allDay" class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{{ event.period }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <h5 class="font-bold text-slate-900 text-base truncate mb-1">{{ event.title }}</h5>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wide mb-2"
                  :class="STATUS_CLASS_MAP[event.status]"
                >
                  {{ STATUS_LABEL_MAP[event.status] }}
                </span>
                <p v-if="event.description" class="text-xs text-slate-500 line-clamp-2 mb-2">{{ event.description }}</p>
                <div class="flex flex-wrap items-center gap-y-1 gap-x-3">
                  <span class="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <span class="material-symbols-outlined text-[14px] text-sky-500">location_on</span>
                    {{ event.location || '未指定地點' }}
                  </span>
                  <span class="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <span class="material-symbols-outlined text-[14px] text-indigo-400">group</span>
                    {{ event.attendees }} 人參與
                  </span>
                </div>
              </div>

              <div v-if="canEditEvent(event.createdBy)" class="flex flex-col gap-2 relative z-30" @click.stop>
                <button @click="navigateToEditEvent(event.id)" class="size-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-sky-50 hover:text-sky-500 transition-all">
                  <span class="material-symbols-outlined text-sm">edit</span>
                </button>
                <button
                  v-if="canDeleteEvent(event.createdBy)"
                  @click="handleDeleteEvent(event.id)"
                  class="size-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all"
                >
                  <span class="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="pt-2">
        <div class="flex items-center justify-between mb-4 px-2">
          <h4 class="text-sm font-bold text-slate-500 uppercase tracking-widest">最新公告</h4>
          <button @click="viewAllAnnouncements" class="text-[11px] font-bold text-sky-600 hover:text-sky-700 transition-colors">
            查看全部
          </button>
        </div>

        <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <button
            v-for="(item, idx) in announcements"
            :key="item.id"
            class="w-full text-left p-6 hover:bg-slate-50/50 transition-colors"
            :class="{ 'border-b border-slate-50': idx !== announcements.length - 1 }"
          >
            <div class="flex items-center gap-2 mb-2">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-600 uppercase tracking-wider">
                {{ item.category }}
              </span>
              <span class="text-[10px] font-bold text-slate-400">{{ item.date }} {{ item.time }}</span>
            </div>
            <h5 class="font-bold text-slate-900 text-sm mb-1">{{ item.title }}</h5>
            <p class="text-slate-500 text-xs leading-relaxed line-clamp-2">{{ item.content }}</p>
          </button>
        </div>
      </section>
    </main>

    <!-- Side Menu -->
    <van-action-sheet v-model:show="menuVisible" title="選單" class="rounded-t-[2.5rem] overflow-hidden">
      <div class="px-6 pb-12 pt-4 space-y-3">
        <button
          v-if="canAddEvent"
          @click="menuVisible = false; navigateToEditor()"
          class="w-full flex items-center gap-4 p-4 rounded-2xl bg-sky-50 text-sky-600 font-bold hover:bg-sky-100 transition-all"
        >
          <div class="size-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
            <span class="material-symbols-outlined">add_circle</span>
          </div>
          <span>新增活動</span>
        </button>

        <button
          @click="menuVisible = false; router.push('/user-center')"
          class="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-all"
        >
          <div class="size-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
            <span class="material-symbols-outlined">account_circle</span>
          </div>
          <span>會員中心</span>
        </button>
      </div>
    </van-action-sheet>

    <!-- Event Detail Modal -->
    <van-action-sheet v-model:show="eventDetailVisible" title="活動詳情" class="rounded-t-[2.5rem] overflow-hidden">
      <div v-if="selectedEvent" class="px-6 pb-12 pt-4 space-y-6">
        <div class="flex items-start gap-4">
          <div class="size-14 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg" :style="{ backgroundColor: selectedEvent.color || '#0EA5E9' }">
            <span class="text-[10px] font-bold uppercase opacity-80">{{ format(selectedEvent.startAt, 'MMM') }}</span>
            <span class="text-xl font-black">{{ format(selectedEvent.startAt, 'd') }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-xl font-bold text-slate-900 leading-tight">{{ selectedEvent.title }}</h3>
            <div class="flex items-center gap-2 mt-1">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wide"
                :class="STATUS_CLASS_MAP[selectedEvent.status]"
              >
                {{ STATUS_LABEL_MAP[selectedEvent.status] }}
              </span>
              <span class="text-xs text-slate-400 font-medium">{{ selectedEvent.time }} {{ selectedEvent.period }}</span>
            </div>
          </div>
        </div>

        <div class="space-y-4 bg-slate-50 rounded-3xl p-5">
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined text-sky-500">location_on</span>
            <div class="flex-1">
              <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">地點</p>
              <p class="text-sm text-slate-700 font-medium">{{ selectedEvent.location || '未指定地點' }}</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="material-symbols-outlined text-indigo-400">schedule</span>
            <div class="flex-1">
              <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">時間</p>
              <p class="text-sm text-slate-700 font-medium">
                {{ format(selectedEvent.startAt, 'yyyy/MM/dd HH:mm') }} - 
                {{ format(selectedEvent.endAt, 'HH:mm') }}
              </p>
            </div>
          </div>
        </div>

        <div v-if="selectedEvent.description" class="space-y-2 px-1">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">活動簡介</p>
          <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{{ selectedEvent.description }}</p>
        </div>

        <div class="pt-4">
          <button
            @click="handleRegister"
            :disabled="isRegistered || registering || checkingRegistration || selectedEvent.status === 'closed'"
            class="w-full h-14 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
            :class="[
              isRegistered 
                ? 'bg-emerald-500 text-white cursor-not-allowed shadow-emerald-200' 
                : (selectedEvent.status === 'closed' ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-sky-500 text-white hover:bg-sky-600 active:scale-[0.98] shadow-sky-200')
            ]"
          >
            <span v-if="registering" class="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span v-else class="material-symbols-outlined">{{ isRegistered ? 'check_circle' : (selectedEvent.status === 'closed' ? 'lock' : 'how_to_reg') }}</span>
            <span>
              {{ isRegistered ? '已完成報名' : (registering ? '處理中...' : (selectedEvent.status === 'closed' ? '報名已截止' : '立即報名')) }}
            </span>
          </button>
          <p v-if="checkingRegistration" class="text-[10px] text-center text-slate-400 mt-2">正在確認報名狀態...</p>
        </div>
      </div>
    </van-action-sheet>
  </div>
</template>

<style scoped>
.dashboard-page {
  background-color: #f8fafc;
  min-height: 100vh;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.van-action-sheet {
  max-height: 80%;
}
</style>
