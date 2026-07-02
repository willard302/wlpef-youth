<script setup lang="ts">
import EventForm from './components/EventForm.vue'
import PointsBreakdownModal from './components/PointsBreakdownModal.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
})

const router = useRouter()
const {
  Quick_Actions,
  isLoading,
  selectedEvent,
  showEventPicker,
  pointsBreakdownVisible,
  eventFormVisible,
  editingEventId,
  stats,
  headerActions,
  eventPickerActions,
  displayStats,
  openEventEditor,
  loadEvents
} = useAdminHome()



onMounted(() => {
  loadEvents()
})
</script>

<template>
  <div class="admin-dashboard pb-24">
    <AppHeaderHero
      eyebrow="管理後台"
      title="管理中心"
      height-class="42"
    >
      <template #actions>
        <div class="flex">
          <button
            v-for="button in headerActions"
            :key="button.label"
            @click="button.action"
            class="size-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-all ml-2"
          >
            <AppIcon :name="button.icon" size="md" />
          </button>
        </div>
      </template>

      <!-- Event Selector Trigger -->
      <div class="mt-4 flex flex-col gap-1">
        <p class="text-sky-100 text-[10px] font-bold uppercase tracking-widest opacity-80">正在檢視活動</p>
        <div class="flex items-center justify-between gap-2">
          <button
            v-if="selectedEvent"
            @click="openEventEditor(selectedEvent.id)"
            class="flex items-center gap-2 text-left group min-w-0"
          >
            <h2 class="text-white text-xl font-bold truncate max-w-[240px]">
              {{ selectedEvent?.title || '載入活動中...' }}
            </h2>
          </button>

          <button
            @click="showEventPicker = true"
            class="shrink-0 size-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all"
          >
            <AppIcon name="swap_horiz" :size="18" />
          </button>
        </div>
      </div>
    </AppHeaderHero>

    <main class="px-4 -mt-4 relative z-20 space-y-6">
      <!-- Quick Stats Grid -->
      <section class="grid grid-cols-2 gap-4">
        <div 
          v-for="stat in displayStats" 
          :key="stat.id"
          class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex gap-3 transition-all active:scale-[0.98]"
          :class="{ 'cursor-pointer hover:border-primary/30': stat.clickable }"
          @click="stat.clickable && (stat.path ? router.push(stat.path) : stat.action?.())"
        >
          <div :class="[stat.bg, stat.color, 'size-12 rounded-2xl flex items-center justify-center']">
            <AppIcon :name="stat.icon" size="md" />
          </div>
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ stat.label }}</p>
            <div class="flex items-baseline gap-1 mt-1">
              <van-loading v-if="isLoading" type="spinner" />
              <template v-else>
                <p class="text-xl font-black text-slate-800">{{ stat.value }}</p>
                <span v-if="stat.id === 'points' && !isLoading" class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">PTS</span>
              </template>
            </div>
          </div>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="space-y-4">
        <h3 class="px-2 text-sm font-bold text-slate-500 uppercase tracking-widest">快速功能</h3>
        <div class="grid grid-cols-3 gap-y-6 gap-x-2">
          <button
            v-for="action in Quick_Actions"
            :key="action.label"
            @click="router.push(action.path)"
            class="flex flex-col items-center gap-2"
          >
            <div :class="[action.color, 'size-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-100 active:scale-95 transition-transform']">
              <AppIcon :name="action.icon" size="md" />
            </div>
            <span class="text-[10px] font-bold text-slate-600">{{ action.label }}</span>
          </button>
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

    <EventForm 
      v-model:show="eventFormVisible"
      :event-id="editingEventId"
      @saved="loadEvents"
    />

    <!-- Points Breakdown Modal -->
    <PointsBreakdownModal 
      v-model:show="pointsBreakdownVisible"
      :event-id="selectedEvent?.id || ''"
      :stats="stats"
    />
  </div>
</template>

<style scoped>
.admin-dashboard {
  background-color: #f8fafc;
  min-height: 100vh;
}
</style>
