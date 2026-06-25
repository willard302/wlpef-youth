<script setup lang="ts">
import { format as fnsFormat } from 'date-fns'
import { eventAdminService } from '~/services/eventAdmin.js'
import type { Event } from '~/types'
import EventForm from './components/EventForm.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
})

const { addToast } = useToast()

const isLoading = ref(true)
const events = ref<Event[]>([])
const searchQuery = ref('')
const eventFormVisible = ref(false)
const editingEventId = ref<string | null>(null)

const loadEvents = async () => {
  isLoading.value = true
  try {
    events.value = await eventAdminService.fetchAllEventsForAdmin()
  } catch (err: any) {
    addToast('載入活動列表失敗', 'error')
  } finally {
    isLoading.value = false
  }
}

const openEditor = (id: string | null = null) => {
  editingEventId.value = id
  eventFormVisible.value = true
}

const filteredEvents = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  if (!keyword) return events.value
  return events.value.filter(e => 
    e.title.toLowerCase().includes(keyword) || 
    (e.location && e.location.toLowerCase().includes(keyword))
  )
})

onMounted(() => {
  loadEvents()
})
</script>

<template>
  <div class="events-admin-page pb-24 min-h-screen bg-slate-50">
    <AppHeaderPage title="活動管理">
      <template #actions>
        <button
          @click="openEditor()"
          class="size-10 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
        >
          <AppIcon name="add" />
        </button>
      </template>
    </AppHeaderPage>

    <main class="px-4 mt-4 space-y-6">
      <!-- Search -->
      <SearchBar
        v-model="searchQuery"
        placeholder="搜尋活動名稱..."
      />
      <!-- List -->
      <AppLoading v-if="isLoading" />

      <div v-else-if="filteredEvents.length === 0" class="bg-white rounded-[2rem] py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200">
        <AppIcon name="event_busy" :size="36" class="text-slate-200 mb-2" />
        <p class="text-slate-400 text-sm font-medium">尚無活動資料</p>
      </div>

      <div v-else class="grid gap-4">
        <div
          v-for="event in filteredEvents"
          :key="event.id"
          @click="openEditor(event.id)"
          class="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer hover:border-sky-200"
        >
          <div 
            class="size-14 rounded-2xl flex flex-col items-center justify-center shrink-0"
          >
            <span class="text-[10px] font-bold uppercase opacity-60">
              {{ fnsFormat(event.startAt, 'MMM') }}
            </span>
            <span class="text-xl font-black">
              {{ fnsFormat(event.startAt, 'dd') }}
            </span>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <h3 class="font-bold text-slate-900 truncate">{{ event.title }}</h3>
              <span 
                class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter shrink-0"
                :class="{
                  'bg-emerald-100 text-emerald-600': event.status === 'published',
                  'bg-amber-100 text-amber-600': event.status === 'draft',
                  'bg-slate-100 text-slate-500': event.status === 'closed'
                }"
              >
                {{ event.status === 'published' ? '已發佈' : (event.status === 'draft' ? '草稿' : '已關閉') }}
              </span>
            </div>
            <p class="text-xs text-slate-400 truncate flex items-center gap-1">
              <AppIcon name="location_on" :size="14" />
              {{ event.location || '未設定地點' }}
            </p>
          </div>

          <div class="shrink-0 text-slate-300">
            <AppIcon name="chevron_right" />
          </div>
        </div>
      </div>
    </main>

    <EventForm
      v-model:show="eventFormVisible"
      :event-id="editingEventId"
      @saved="loadEvents"
    />
  </div>
</template>

<style scoped>
.events-admin-page {
  background-color: #f8fafc;
}
</style>
