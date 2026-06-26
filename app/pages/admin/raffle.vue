<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const {
  events,
  selectedEventId,
  selectedEvent,
  candidateCount,
  winnersByRound,
  drawCount,
  confirmedCount,
  countDirty,
  withinWindow,
  isActive,
  loading,
  drawing,
  totalDrawn,
  currentRound,
  loadEvents,
  onSelectEvent,
  applyCount,
  start,
  stop,
  drawOne,
  revoke,
} = useAdminRaffle()

const lotteryItems = ref([
  { id: '1', name: '禪社紀念衫 (共10名)', totalWinners: 10 },
  { id: '2', name: '禪社隨行杯 (共5名)', totalWinners: 5 },
  { id: '3', name: '特等純棉毛巾 (共3名)', totalWinners: 3 }
])

const selectedItem = ref<string>('1')

onMounted(loadEvents)

// 開始抽獎：若現在不在活動時間窗內，先警告（一般使用者收不到通知）
async function onStart() {
  if (!withinWindow.value) {
    try {
      await showConfirmDialog({
        title: '不在活動時段',
        message: '現在不在此活動的時間窗內（活動前 30 分 ~ 結束後 30 分），一般使用者的頁面不會輪詢、收不到中獎通知。仍要開始抽獎嗎？',
        confirmButtonText: '仍要開始',
        confirmButtonColor: '#f59e0b',
      })
    }
    catch {
      return // 使用者取消
    }
  }
  await start()
}

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

      <div>
        <label class="flex items-center gap-2 text-[#24527A] text-[15px] font-bold mb-3">
          <svg class="w-4 h-4 text-[#0091E6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          </svg>
          選擇抽獎項目
        </label>
        <div class="relative">
          <select
            v-model="selectedItem"
            class="w-full appearance-none bg-[#F5F8FE] text-[#334155] rounded-2xl py-4 px-5 pr-12 font-medium focus:outline-none focus:ring-2 focus:ring-[#0091E6]/20 transition-all cursor-pointer"
          >
            <option v-for="item in lotteryItems" :key="item.id" :value="item.id">
              {{ item.name }}
            </option>
          </select>
          <div class="absolute inset-y-0 right-5 flex items-center pointer-events-none text-[#64748B]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>
      </div>

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
          <button
            v-if="!isActive"
            @click="onStart"
            class="w-full h-12 bg-sky-500 text-white rounded-2xl font-bold shadow-lg shadow-sky-100 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <span v-if="loading" class="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <AppIcon v-else name="play_arrow" :size="18" />
            <span>開始抽獎</span>
          </button>
          <button
            v-else
            @click="stop"
            class="w-full h-12 bg-white text-red-500 border border-red-100 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <span v-if="loading" class="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <AppIcon v-else name="stop" :size="18" />
            <span>結束抽獎</span>
          </button>
        </section>

        <!-- 抽獎參數 -->
        <section class="rounded-lg border border-slate-200 p-3 space-y-2">
          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 text-[#24527A] text-[15px] font-bold">
              <AppIcon name="people" />
              每次抽取人數
            </label>
            <div class="flex items-center gap-2">
              <van-stepper v-model="drawCount" :min="1" :max="100" integer />
              <van-button size="small" type="primary" :disabled="!countDirty" @click="applyCount">套用</van-button>
            </div>
          </div>
          <p class="text-xs" :class="countDirty ? 'text-amber-600' : 'text-slate-400'">
            <template v-if="countDirty">已調整位數，按「套用」才會生效</template>
            <template v-else>目前設定：每輪 <b>{{ confirmedCount }}</b> 位</template>
          </p>
        </section>

        <section class="rounded-lg border border-slate-200 p-3 space-y-2">
          <van-button
            type="success"
            block
            :loading="drawing"
            :disabled="!isActive"
            @click="drawOne"
          >
            抽這一輪（第 {{ currentRound + 1 }} 輪・{{ confirmedCount }} 位）
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
