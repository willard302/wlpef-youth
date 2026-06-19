<script setup lang="ts">
import { format as fnsFormat } from 'date-fns'
import { eventService } from '~/services/event'
import type { Event } from '@/types'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
  showTabbar: true,
  tabbarKey: 'events'
})

const router = useRouter()
const { addToast } = useToast()

const { deleteEventToDatabase } = useAdminEvents()
const { userProfile, isLoading: isUserLoading } = useUser()
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
  isCalendarLoading,
  isAdmin,
  canEditEvent,
  canDeleteEvent,
  canViewAllEventStatus,
} = useCalendar()

const { openMenu } = useSideMenu()

const isEventLoading = ref(true)
const upcomingEventData = ref<Event | null>(null)
const isOngoing = ref(false)
const isUpcomingRegistrationLoading = ref(false)
const isUpcomingRegistered = ref(false)
const upcomingEventDisplay = computed(() => {
  const event = upcomingEventData.value
  if (!event) {
    return {
      title: '目前沒有活動',
      meta: isAdmin.value ? '管理員：建立活動並發佈後會顯示在這裡' : '請稍後再查看最新活動',
    }
  }

  const timeText = event.allDay
    ? fnsFormat(event.startAt, 'MM/dd')
    : fnsFormat(event.startAt, 'MM/dd HH:mm')

  return {
    id: event.id,
    title: event.title,
    meta: `${timeText} · ${event.location || '地點未定'}`,
  }
})


const isUpcomingCheckedIn = ref(false)

const upcomingRegistrationStatus = computed(() => {
  const event = upcomingEventData.value
  if (!event) return ''
  if (canViewAllEventStatus.value) return STATUS_LABEL_MAP[event.status]
  if (isUpcomingRegistrationLoading.value) return '確認狀態中'
  if (isUpcomingCheckedIn.value) return '已報到'
  if (isUpcomingRegistered.value) return '已報名'
  if (event.status === 'closed') return '報名已關閉'
  return '未報名'
})

// Event Detail Modal State
const eventDetailVisible = ref(false)
const selectedEvent = ref<Event | null>(null)
const isRegistered = ref(false)
const isCheckedIn = ref(false)
const checkingRegistration = ref(false)

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
  isUpcomingRegistered.value = false
  isUpcomingRegistrationLoading.value = false
  isOngoing.value = false

  try {
    const status = canViewAllEventStatus.value ? undefined : 'published'
    
    // First, check for ongoing events
    const ongoingEvents = await eventService.fetchOngoingEvents(status)
    
    if (ongoingEvents.length > 0) {
      upcomingEventData.value = ongoingEvents[0] || null
      isOngoing.value = true
    } else {
      // If no ongoing events, fetch upcoming events
      const events = await eventService.fetchUpcomingEvents(1, status)
      upcomingEventData.value = events[0] || null
      isOngoing.value = false
    }

    if (upcomingEventData.value && !canViewAllEventStatus.value) {
      isUpcomingRegistrationLoading.value = true
      const [regStatus, checkinStatus] = await Promise.all([
        eventService.checkRegistrationStatus(upcomingEventData.value.id),
        eventService.checkCheckinStatus(upcomingEventData.value.id)
      ])
      isUpcomingRegistered.value = regStatus
      isUpcomingCheckedIn.value = checkinStatus
    }
  } catch (error) {
    console.error('Failed to load events', error)
    upcomingEventData.value = null
    isUpcomingRegistered.value = false
  } finally {
    isUpcomingRegistrationLoading.value = false
    isEventLoading.value = false
  }
}

const navigateToEditEvent = (eventId: string) => {
  router.push({ path: '/admin/events', query: { id: eventId } })
}

const handleDeleteEvent = async (eventId: string) => {
  try {
    await showDialog({
      title: '刪除活動',
      message: '確定要刪除這個活動嗎？此操作無法復原。',
      confirmButtonText: '刪除',
      cancelButtonText: '取消',
      confirmButtonColor: '#ef4444',
    })
  } catch {
    return
  }

  try {
    await deleteEventToDatabase(eventId)
    addToast('活動已刪除', 'success')
    await Promise.all([loadEvents(), loadUpcomingEvent()])
  } catch (err: any) {
    addToast(err.message || '刪除活動失敗', 'error')
  }
}

const openEventDetail = async (event: Event) => {
  if (!event) return
  
  // 如果是管理員，直接跳轉到編輯頁面
  if (userProfile.value?.role === 'admin') {
    navigateToEditEvent(event.id)
    return
  }

  selectedEvent.value = event
  eventDetailVisible.value = true
  isRegistered.value = false
  isCheckedIn.value = false
  checkingRegistration.value = true
  
  try {
    const [regStatus, checkinStatus] = await Promise.all([
      eventService.checkRegistrationStatus(event.id),
      eventService.checkCheckinStatus(event.id)
    ])
    isRegistered.value = regStatus
    isCheckedIn.value = checkinStatus
  } catch (err) {
    console.error('Check status error:', err)
  } finally {
    checkingRegistration.value = false
  }
}

const handleRegister = async () => {
  if (!selectedEvent.value || isRegistered.value) return

  const formUrl = selectedEvent.value.googleFormUrl
  if (!formUrl) {
    addToast('此活動尚未設定 Google 表單連結', 'error')
    return
  }

  window.open(formUrl, '_blank', 'noopener,noreferrer')
}

onMounted(async () => {
  await Promise.all([loadEvents(), loadUpcomingEvent()])
})
</script>

<template>
  <div class="dashboard-page pb-24">
    <AppHeaderHero
      :eyebrow="userProfile?.role === 'admin' ? '管理員模式' : '領袖會社青團'"
      :title="`哈囉，${userProfile?.name ?? '使用者'}`"
      height-class="h-56"
    >
      <template #actions>
        <button
          @click="openMenu"
          class="size-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-all"
        >
          <AppIcon name="menu" />
        </button>
      </template>

      <p class="text-sky-100 text-xs font-bold uppercase tracking-widest mb-1 opacity-80">{{ isOngoing ? '正在進行' : '即將到來' }}</p>
      <div v-if="isEventLoading" class="flex items-center gap-3 py-2 text-sky-50">
        <span class="size-5 rounded-full border-2 border-white/80 border-t-transparent animate-spin"></span>
        <span class="text-sm font-bold">讀取活動中...</span>
      </div>
      <button
        v-else
        class="space-y-1 px-1 text-left disabled:cursor-default"
        :disabled="!upcomingEventData"
        @click="upcomingEventData && openEventDetail(upcomingEventData)"
      >
        <div class="flex flex-wrap items-center gap-2 min-w-0 w-full">
          <div class="flex items-center gap-2 min-w-0 flex-1 pr-1">
            <span v-if="isOngoing" class="flex-shrink-0 size-2 rounded-full bg-rose-400 animate-pulse shadow-[0_0_8px_rgba(251,113,133,0.8)]"></span>
            <h1 class="min-w-0 w-full truncate text-2xl font-extrabold leading-tight text-white drop-shadow-sm">{{ upcomingEventDisplay.title }}</h1>
          </div>
          <span
            v-if="upcomingEventData"
            class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors"
            :class="[
              canViewAllEventStatus 
                ? STATUS_CLASS_MAP[upcomingEventData.status] 
                : (isUpcomingCheckedIn 
                  ? 'border-red-200 bg-red-500 text-white shadow-sm shadow-red-100' 
                  : 'border-white/25 bg-white/15 text-white')
            ]"
          >
            <AppIcon :name="canViewAllEventStatus ? 'sell' : (isUpcomingCheckedIn ? 'task_alt' : (isUpcomingRegistered ? 'check_circle' : 'how_to_reg'))" 
              :size="14" 
            />
            {{ upcomingRegistrationStatus }}
          </span>
        </div>
        <p class="text-sky-50 text-sm font-medium opacity-90">{{ upcomingEventDisplay.meta }}</p>
      </button>
    </AppHeaderHero>

    <main class="px-4 -mt-8 relative z-20 space-y-6">
      <section class="white-glass-card p-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-2">
            <button @click="previousMonth" class="size-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-100 transition-colors">
              <AppIcon name="chevron_left" class="text-lg" />
            </button>
            <h3 class="text-lg font-bold text-slate-800 min-w-[120px] text-center">{{ monthYear }}</h3>
            <button @click="nextMonth" class="size-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-100 transition-colors">
              <AppIcon name="chevron_right" class="text-lg" />
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
        </div>

        <div v-if="isCalendarLoading || isLoading" class="flex flex-col items-center py-12 text-slate-400">
          <div class="size-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p class="text-xs font-bold tracking-widest">載入活動中...</p>
        </div>

        <div v-else-if="eventsForSelectedDate.length === 0" class="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[2rem] py-12 flex flex-col items-center justify-center text-center">
          <AppIcon name="event_busy" class="text-4xl text-slate-200 mb-2" />
          <p class="text-slate-400 text-sm font-medium">這天還沒有活動</p>
        </div>

        <div v-else class="grid gap-4">
          <div
            v-for="event in eventsForSelectedDate"
            :key="event.id"
            @click="openEventDetail(event)"
            class="group bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden cursor-pointer active:scale-[0.98]"
          >
            <div class="absolute top-0 left-0 w-1.5 h-full" :style="{ backgroundColor: '#0EA5E9' }"></div>
            <div class="flex items-start gap-4">
              <div class="flex flex-col items-center min-w-[50px] pt-1">
                <span class="text-lg font-black text-slate-800 leading-none">{{ event.time }}</span>
                <span v-if="!event.allDay" class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{{ event.period }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <h5 class="font-bold text-slate-900 text-base truncate mb-1">{{ event.title }}</h5>
                <span
                  v-if="canViewAllEventStatus"
                  class="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wide mb-2"
                  :class="STATUS_CLASS_MAP[event.status]"
                >
                  {{ STATUS_LABEL_MAP[event.status] }}
                </span>
                <p v-if="event.description" class="text-xs text-slate-500 line-clamp-2 mb-2">{{ event.description }}</p>
                <div class="flex flex-wrap items-center gap-y-1 gap-x-3">
                  <span class="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <AppIcon name="location_on" :size="14" class="text-sky-500" />
                    {{ event.location || '未指定地點' }}
                  </span>
                </div>
              </div>

              <div v-if="canEditEvent(event.createdBy)" class="flex flex-col relative z-30 self-center" @click.stop>
                <button
                  v-if="canDeleteEvent(event.createdBy)"
                  @click="handleDeleteEvent(event.id)"
                  class="size-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all"
                >
                  <AppIcon name="delete" class="text-md" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Event Detail Modal -->
    <van-action-sheet v-model:show="eventDetailVisible" title="活動詳情" class="rounded-t-[2.5rem] overflow-hidden">
      <div v-if="selectedEvent" class="px-6 pb-12 pt-4 space-y-6">
        <div class="flex items-start gap-4">
          <div class="size-14 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg" :style="{ backgroundColor: '#0EA5E9' }">
            <span class="text-[10px] font-bold uppercase opacity-80">{{ format(selectedEvent.startAt, 'MMM') }}</span>
            <span class="text-xl font-black">{{ format(selectedEvent.startAt, 'd') }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-xl font-bold text-slate-900 leading-tight">{{ selectedEvent.title }}</h3>
            <div class="flex items-center gap-2 mt-1">
              <span
                v-if="canViewAllEventStatus"
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
            <AppIcon name="location_on" class="text-sky-500" />
            <div class="flex-1">
              <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">地點</p>
              <p class="text-sm text-slate-700 font-medium">{{ selectedEvent.location || '未指定地點' }}</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <AppIcon name="schedule" class="text-indigo-400" />
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
            :disabled="isCheckedIn || isRegistered || checkingRegistration || selectedEvent.status === 'closed' || !selectedEvent.googleFormUrl"
            class="w-full h-14 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
            :class="[
              isCheckedIn
                ? 'bg-red-500 text-white cursor-not-allowed shadow-red-200'
                : isRegistered 
                  ? 'bg-emerald-500 text-white cursor-not-allowed shadow-emerald-200' 
                  : (selectedEvent.status === 'closed' || !selectedEvent.googleFormUrl ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-sky-500 text-white hover:bg-sky-600 active:scale-[0.98] shadow-sky-200')
            ]"
          >
            <AppIcon :name="isCheckedIn ? 'task_alt' : (isRegistered ? 'check_circle' : (selectedEvent.status === 'closed' ? 'lock' : 'open_in_new'))" />
            <span>
              {{ isCheckedIn ? '已完成活動報到' : (isRegistered ? '已完成報名' : (selectedEvent.status === 'closed' ? '報名已截止' : (!selectedEvent.googleFormUrl ? '尚未開放報名' : '前往 Google 表單報名'))) }}
            </span>
          </button>
          <p v-if="isCheckedIn" class="text-[10px] text-center text-slate-400 mt-2">
            * 您已完成本次活動的現場報到。
          </p>
          <p v-else-if="isRegistered" class="text-[10px] text-center text-slate-400 mt-2">
            * 點數將於一分鐘內自動發放。
          </p>
          <p v-else-if="checkingRegistration" class="text-[10px] text-center text-slate-400 mt-2">正在確認狀態...</p>
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
</style>
