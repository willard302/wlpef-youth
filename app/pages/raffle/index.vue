<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
  showTabbar: true,
})

// 通知呈現（dialog / modal）由 useRaffleNotice 依 config 或 notifyStyle 統一處理
const {
  countdown,
  isRefreshing,
  active,
  myWinningPrizes,
  lastError,
  polling,
  statusLabel,
  statusDotClass,
  memberDisplay,
  showWinModal,
  closeWinModal,
  updateCountdown,
  handleRefresh,
} = useRaffleNotice()

const { userProfile } = useUser()

let countdownTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  updateCountdown()
  countdownTimer = setInterval(updateCountdown, 1000)
})
onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

// ── 抽獎資格（已繳費即符合） ──────────────────────────
const isEligible = computed(() => !!userProfile.value)
</script>

<template>
  <!-- 整頁背景漸層 -->
  <div class="raffle-page min-h-screen flex flex-col">
    <AppHeaderPage title="快樂抽抽抽" />

    <main class="flex-1 px-5 pt-6 pb-28 space-y-4 overflow-y-auto">

      <!-- 會員資料卡 -->
      <div class="glass-card p-5 flex flex-col items-start">
        <div class="space-y-0.5">
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">會員編號</p>
        </div>
        <div class="flex items-end justify-between w-full">
          <h2 class="text-lg font-black text-primary tracking-tight truncate min-w-0 flex-1 line-clamp-2 whitespace-normal break-all">{{ memberDisplay }}</h2>
          <span
            v-if="isEligible"
            class="flex flex-shrink-0 items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full"
            :class="isEligible ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-400'"
          >
            <AppIcon name="check_circle" :size="14" :fill="true" />
            {{isEligible ? '符合資格' : '不符資格'}}
          </span>
        </div>
      </div>

      <!-- 當前狀態卡 -->
      <div class="glass-card p-5 relative overflow-hidden">
        <!-- 裝飾光暈 -->
        <div class="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-sky-200/40 blur-2xl pointer-events-none" />

        <div class="flex justify-between items-center relative">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <!-- 脈衝指示點 -->
              <span class="relative flex h-3 w-3">
                <span
                  v-if="active || polling"
                  class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                  :class="statusDotClass"
                />
                <span class="relative inline-flex rounded-full h-3 w-3" :class="statusDotClass" />
              </span>
              <h3 class="text-xl font-black text-slate-900">抽獎{{ statusLabel }}</h3>
            </div>
          </div>

          <!-- 圖示角落 -->
          <div class="bg-sky-100 rounded-2xl">
            <AppIcon name="auto_awesome" class="text-sky-500" size="md" />
          </div>
        </div>

        <!-- 錯誤提示 -->
        <p v-if="lastError" class="text-xs text-rose-500 flex items-center gap-1">
          <AppIcon name="error" :size="14" :fill="true" />
          {{ lastError }}
        </p>
      </div>

      <!-- 重新整理按鈕 -->
      <van-button 
        text="重新整理狀態"
        :loading="isRefreshing"
        round size="large" color="#0284c7"
        :disabled="isRefreshing"
        @click="handleRefresh"
      />

      <!-- Bento 格 ── 今日獎項 + 倒計時 -->
      <div class="grid grid-cols-2 gap-4">
        <!-- 今日獎項 -->
        <div class="glass-card p-4 flex flex-col justify-between h-32">
          <AppIcon name="military_tech" class="text-primary" size="md" />
          <p class="text-xs font-bold text-slate-700 leading-snug">
            獎項說明：<br />
            <span class="text-slate-900 font-black">請依後台預先設定為準</span>
          </p>
        </div>

        <!-- 倒計時 -->
        <div class="glass-card p-4 flex flex-col justify-between h-32">
          <AppIcon name="schedule" class="text-slate-400" size="md" />
          <p class="text-xs font-bold text-slate-700 leading-snug">
            倒數計時：<br />
            <span class="text-slate-900 font-black tabular-nums">{{ countdown }}</span>
          </p>
        </div>
      </div>

      <!-- 中獎輪次（若有） -->
      <div
        v-if="myWinningPrizes.length"
        class="glass-card p-5 bg-emerald-50/60 border border-emerald-200/60"
      >
        <div class="flex items-center gap-2 mb-2">
          <AppIcon name="emoji_events" class="text-emerald-500" size="md" :fill="true" />
          <span class="font-black text-emerald-700 text-sm">恭喜！您中獎了！</span>
        </div>
        <p class="text-xs text-emerald-600">
          中獎獎項：<b>{{ myWinningPrizes.map(win => win.label).join('、') }}</b>
        </p>
      </div>

    </main>

    <!-- 中獎彈窗（notifyStyle='modal' 時生效；'dialog' 時走 showDialog、此處恆關閉） -->
    <RaffleWinModal :open="showWinModal" :wins="myWinningPrizes" @close="closeWinModal" />
  </div>
</template>

<style scoped>
/* ── 背景漸層 ── */
.raffle-page {
  background: radial-gradient(circle at 10% 10%, #eff6ff 0%, #e0f2fe 40%, #f8fafc 100%);
}

/* ── Glass Card（沿用 global.css 基礎，局部加強） ── */
.glass-card {
  @apply rounded-3xl border border-white/60 bg-white/40 backdrop-blur-xl shadow-lg;
}
</style>
