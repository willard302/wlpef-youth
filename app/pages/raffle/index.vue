<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
  showTabbar: true,
})

const {
  active,
  currentRound,
  myWinningRounds,
  lastError,
  polling,
  myId,
  poll,
} = useRaffleNotice({
  onWin(rounds) {
    void showDialog({
      title: '🎉 恭喜中獎！',
      message: `你在第 ${rounds.join('、')} 輪中獎了！`,
      confirmButtonText: '太棒了',
      theme: 'round-button',
    })
  },
})

const { userProfile } = useUser()

// ── 狀態文字與顏色 ─────────────────────────────────────
const statusLabel = computed(() => {
  if (!polling.value) return '未開始'
  if (active.value) return '進行中'
  return '準備中'
})

const statusDotClass = computed(() => {
  if (active.value) return 'bg-emerald-400'
  if (polling.value) return 'bg-amber-400'
  return 'bg-slate-400'
})

// ── 刷新旋轉動畫 ──────────────────────────────────────
const isRefreshing = ref(false)

async function handleRefresh() {
  if (isRefreshing.value) return
  isRefreshing.value = true
  await poll()
  setTimeout(() => {
    isRefreshing.value = false
  }, 800)
}

// ── 倒計時（示例：距離整點） ───────────────────────────
const countdown = ref('--:--:--')

function updateCountdown() {
  const now = new Date()
  const next = new Date(now)
  next.setHours(next.getHours() + 1, 0, 0, 0)
  const diff = Math.max(0, next.getTime() - now.getTime())
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  countdown.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

let countdownTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  updateCountdown()
  countdownTimer = setInterval(updateCountdown, 1000)
})
onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

// ── 中獎彈窗（手動觸發展示） ───────────────────────────
const showWinModal = ref(false)

function closeWinModal() {
  showWinModal.value = false
}

// ── 會員編號顯示 ──────────────────────────────────────
const memberDisplay = computed(() => {
  const id = myId.value
  if (!id) return '------'
  const account = id.split('@')[0]
  return `#${account?.toUpperCase()}`
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
            今日獎項：<br />
            <span class="text-slate-900 font-black">深度禪修營門票</span>
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
        v-if="myWinningRounds.length"
        class="glass-card p-5 bg-emerald-50/60 border border-emerald-200/60"
      >
        <div class="flex items-center gap-2 mb-2">
          <AppIcon name="emoji_events" class="text-emerald-500" size="md" :fill="true" />
          <span class="font-black text-emerald-700 text-sm">恭喜！您中獎了！</span>
        </div>
        <p class="text-xs text-emerald-600">
          中獎輪次：<b>{{ myWinningRounds.join('、') }}</b>
        </p>
      </div>

    </main>

    <!-- ── 中獎彈窗 ───────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showWinModal"
          class="fixed inset-0 z-[200] flex items-center justify-center px-6"
          @click.self="closeWinModal"
        >
          <!-- 背景遮罩 -->
          <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-md" @click="closeWinModal" />

          <!-- 彈窗卡片 -->
          <div class="relative z-10 w-full max-w-sm glass-card p-8 text-center space-y-5">
            <!-- 裝飾 logo -->
            <div class="flex justify-center">
              <div class="zen-logo w-16 h-16">
                <div class="zen-logo-inner-1">
                  <div class="zen-logo-inner-2" />
                </div>
              </div>
            </div>

            <div class="space-y-1">
              <h2 class="text-2xl font-black text-slate-900">恭喜中獎！</h2>
              <p class="text-sm text-slate-500">您已被選為本次抽獎的幸運得主！</p>
            </div>

            <div class="space-y-3 pt-2">
              <button
                class="w-full py-4 rounded-full font-bold text-sm text-white bg-gradient-to-r from-sky-600 to-primary shadow-lg active:scale-95 transition-all"
                @click="closeWinModal"
              >
                立即領取
              </button>
              <button
                class="text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors"
                @click="closeWinModal"
              >
                稍後再說
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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

/* ── Zen Logo ── */
.zen-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #ef4444;
  padding: 4px;
  box-shadow: 0 0 20px 6px rgba(255, 255, 255, 0.5);
}
.zen-logo-inner-1 {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #facc15;
  padding: 4px;
}
.zen-logo-inner-2 {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #22c55e;
}

/* ── Modal 進出場動畫 ── */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
