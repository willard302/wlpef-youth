<script setup lang="ts">
import type { Event } from '~/types'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'raffle-admin']
})

const { selectedEvent, changeEvent } = useAdminEventPicker()

const {
  showPrizeModal,
  candidateNames,
  candidateCount,
  winners,
  prizeRows,
  prizeDirty,
  withinWindow,
  isActive,
  loading,
  drawing,
  onSelectEvent,
  removePrizeRow,
  savePrizes,
  start,
  stop,
  drawOne,
  addPrizeRow,
  updatePrizeRow,
} = useAdminRaffle()

const showDrawStage = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingIndex = ref<number | null>(null)
const editingPrize = ref<{ prize: string, name: string, count: number, drawOrder: number } | null>(null)

const openAddPrizeModal = () => {
  formMode.value = 'create'
  editingIndex.value = null
  editingPrize.value = null
  addPrizeRow()
}

const openEditPrizeModal = (index: number) => {
  const prize = prizeRows.value[index]
  if (!prize) return
  formMode.value = 'edit'
  editingIndex.value = index
  editingPrize.value = {
    prize: prize.prize,
    name: prize.name,
    count: prize.count,
    drawOrder: prize.drawOrder,
  }
  showPrizeModal.value = true
}

const submitAddPrize = async(payload: { prize: string, name: string, count: number, drawOrder: number }) => {
  if (formMode.value === 'edit' && editingIndex.value !== null) {
    await updatePrizeRow(editingIndex.value, payload)
    return
  }

  await addPrizeRow(payload)
}

watch(
  () => selectedEvent.value,
  async(newEvent) => {
    await onSelectEvent(newEvent)
  },
  { immediate: true }
)

const handleEventChange = async(event: Event) => {
  await changeEvent(event)
}

const openDrawStage = () => {
  if (!selectedEvent.value) return
  showDrawStage.value = true
}
</script>

<template>
  <div class="raffle-page pb-24 min-h-screen bg-slate-50">
    <AppHeaderPage title="抽獎控制" />

    <main class="px-4 -mt-6 relative z-20 space-y-3 pb-24">
      <AdminEventPicker 
        v-model="selectedEvent"
        @change="handleEventChange"
      />

      <div v-if="selectedEvent" class="grid grid-cols-2 gap-4">
        <div class="stat-card">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">抽獎狀態</p>
          <div class="flex items-end justify-between">
            <p class="text-xl font-black text-slate-800">{{ isActive ? '進行中' : '未開始' }}</p>
          </div>
        </div>
        <div class="stat-card">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">抽獎人數</p>
          <p class="text-xl font-black text-emerald-500">{{ candidateCount ?? 0 }}</p>
        </div>
      </div>

      <template v-if="selectedEvent">
        <section class="stat-card space-y-3">
          <div class="flex items-center justify-between gap-3">
            <label class="flex items-center gap-2 text-[#24527A] text-[15px] font-bold">
              <AppIcon name="military_tech" />
              獎項
            </label>
            <div class="flex items-center gap-2 text-xs font-bold">
              <van-button size="small" type="primary" @click="openAddPrizeModal">新增</van-button>
            </div>
          </div>

          <van-swipe-cell
            v-for="(prize, index) in prizeRows"
            :key="index"
          >
            <template #right>
              <van-button
                square
                type="danger"
                text="刪除"
                icon="delete"
                @click="removePrizeRow(index)"
              />
            </template>
            <van-cell 
              :title="prize.prize || '未命名獎項'"
              :value="prize.name || '未命名獎品'"
              :label="`序位 ${ prize.drawOrder } / 中獎人數 ${ prize.count } 位`"
            />
            <template #left>
              <van-button
                square
                type="warning"
                text="編輯"
                icon="edit"
                @click="openEditPrizeModal(index)"
              />
            </template>
          </van-swipe-cell>
        </section>

        <section class="rounded-lg bg-slate-50 p-3 space-y-3">
          <p class="text-sm text-slate-500 leading-relaxed">
            確認獎項設定後，點擊下方按鈕進入抽獎介面。
          </p>
          <van-button
            icon="casino"
            text="開始抽獎"
            color="#22c55e"
            round
            size="large"
            @click="openDrawStage"
          />
        </section>
      </template>
    </main>

    <AdminRaffleForm
      v-model:show="showPrizeModal"
      :mode="formMode"
      :initial-prize="editingPrize"
      @submit="submitAddPrize"
    />

    <AdminRaffleDrawStage
      v-model:show="showDrawStage"
      :event="selectedEvent"
      :candidate-count="candidateCount"
      :candidate-names="candidateNames"
      :winners="winners"
      :prize-rows="prizeRows"
      :prize-dirty="prizeDirty"
      :within-window="withinWindow"
      :is-active="isActive"
      :loading="loading"
      :drawing="drawing"
      :on-start="start"
      :on-stop="stop"
      :on-draw-one="drawOne"
    />
  </div>
</template>
<style scoped>
  :deep(.van-swipe-cell__right) {
    overflow: hidden;
  }
</style>
