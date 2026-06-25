<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
  showTabbar: false,
  tabbarKey: 'home',
})

const {
  events,
  selectedEventId,
  selectedEvent,
  candidateCount,
  winnersByRound,
  drawCount,
  isActive,
  loading,
  drawing,
  totalDrawn,
  currentRound,
  loadEvents,
  onSelectEvent,
  start,
  stop,
  drawOne,
  revoke,
} = useAdminRaffle()

onMounted(loadEvents)

async function confirmRevoke(round: number) {
  try {
    await showConfirmDialog({
      title: '撤回本輪',
      message: `確定撤回第 ${round} 輪的中獎名單？被撤回者可在後續輪次再被抽中。`,
      confirmButtonText: '撤回',
      confirmButtonColor: '#ef4444',
    })
    await revoke(round)
  }
  catch {
    // 使用者取消
  }
}
</script>

<template>
  <div>
    <AppHeaderPage title="抽獎控制" show-back />

    <div class="p-4 space-y-4">
      <!-- 活動選擇 -->
      <section class="space-y-2">
        <label class="text-sm font-medium text-slate-700">選擇活動</label>
        <select
          :value="selectedEventId ?? ''"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          :disabled="loading"
          @change="onSelectEvent(($event.target as HTMLSelectElement).value)"
        >
          <option v-if="!events.length" value="">（無活動）</option>
          <option v-for="e in events" :key="e.id" :value="e.id">
            {{ e.title }}（門檻 {{ e.raffleThreshold }}）{{ e.raffleActive ? '・抽獎中' : '' }}
          </option>
        </select>
      </section>

      <template v-if="selectedEvent">
        <!-- 狀態 + 開關 -->
        <section class="rounded-lg bg-slate-50 p-3 space-y-3">
          <div class="flex items-center justify-between text-sm">
            <span>抽獎狀態</span>
            <van-tag :type="isActive ? 'success' : 'default'" size="medium">
              {{ isActive ? '進行中' : '未開始' }}
            </van-tag>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span>合格人數（points ≥ {{ selectedEvent.raffleThreshold }}）</span>
            <b>{{ candidateCount ?? '—' }}</b>
          </div>
          <van-button v-if="!isActive" type="primary" block @click="start">開始抽獎</van-button>
          <van-button v-else type="warning" block @click="stop">結束抽獎</van-button>
        </section>

        <!-- 抽獎參數 + 觸發 -->
        <section class="rounded-lg border border-slate-200 p-3 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-slate-700">這一輪抽幾位</span>
            <van-stepper v-model="drawCount" :min="1" :max="100" integer />
          </div>
          <van-button
            type="success"
            block
            :loading="drawing"
            :disabled="!isActive"
            @click="drawOne"
          >
            抽這一輪（第 {{ currentRound + 1 }} 輪）
          </van-button>
          <p v-if="!isActive" class="text-xs text-slate-400">先「開始抽獎」才能抽。</p>
        </section>

        <!-- 結果 -->
        <section class="space-y-2">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-700">中獎名單</h2>
            <span class="text-xs text-slate-400">共 {{ totalDrawn }} 位 / {{ winnersByRound.length }} 輪</span>
          </div>

          <p v-if="!winnersByRound.length" class="text-sm text-slate-400 py-4 text-center">尚未開獎</p>

          <div
            v-for="group in winnersByRound"
            :key="group.round"
            class="rounded-lg border border-slate-200 p-3 space-y-2"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">第 {{ group.round }} 輪（{{ group.items.length }} 位）</span>
              <van-button size="mini" type="danger" plain @click="confirmRevoke(group.round)">撤回本輪</van-button>
            </div>
            <div class="flex flex-wrap gap-2">
              <van-tag
                v-for="w in group.items"
                :key="w.id"
                type="primary"
                size="medium"
              >
                {{ w.name ?? w.user_id.slice(0, 8) }}
              </van-tag>
            </div>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>
