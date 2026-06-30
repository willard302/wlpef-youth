<script setup lang="ts">
import type { Event } from '~/types'
import { format as fnsFormat } from 'date-fns'
import { eventAdminService } from '~/services/eventAdmin.js'

const modelValue = defineModel<Event | null>({ required: true })

const { addToast } = useToast()

const isEventsLoading = ref(false)
const events = ref<Event[]>([])
const showEventPicker = ref(false)

const emit = defineEmits<{
  (e: 'change', event: Event): void
}>()

const loadEvents = async () => {
  isEventsLoading.value = true
  try {
    events.value = await eventAdminService.fetchAllEventsForAdmin()
    if (events.value.length > 0 && !modelValue.value) {
      // 若尚未選擇活動，預設選取最新一個
      selectEvent(events.value[0]!!)
    }
  } catch (err: any) {
    addToast(err.message || '載入活動列表失敗', 'error')
  } finally {
    isEventsLoading.value = false
  }
}

const selectEvent = (event: Event) => {
  modelValue.value = event
  showEventPicker.value = false
  emit('change', event)
}

const eventPickerActions = computed(() => {
  return events.value.map(event => ({
    name: event.title,
    subname: `${fnsFormat(event.startAt, 'yyyy/MM/dd')} (${event.status})`,
    callback: () => selectEvent(event)
  }))
})

onMounted(async () => {
  await loadEvents()
})
</script>

<template>
  <div>
    <section class="white-glass-card p-5 mt-8 bg-white rounded-3xl border border-slate-100 shadow-sm">
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">目前檢視活動</p>
      <div class="flex items-center justify-between">
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-bold text-slate-800 truncate">
            {{ modelValue?.title || (isEventsLoading ? '載入中...' : '尚未選擇活動') }}
          </h3>
        </div>
        <button
          @click="showEventPicker = true"
          type="button"
          class="px-4 py-2 rounded-xl bg-sky-50 text-sky-600 text-xs font-bold hover:bg-sky-100 transition-all flex items-center gap-2"
        >
          <AppIcon name="swap_horiz" :size="18" />
        </button>
      </div>
    </section>

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