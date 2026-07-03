<script setup lang="ts">
import type { AdminRaffleDrawStageEmit, AdminRaffleDrawStageProps } from '~/composables/admin/raffleDrawStage'

const props = defineProps<AdminRaffleDrawStageProps>()
const emit = defineEmits<AdminRaffleDrawStageEmit>()

const {
  nameList,
  currentIndex,
  isRolling,
  showModel,
  showWinnerPopup,
  latestWinners,
  currentPrizeLabel,
  winnersByRound,
  getRoundPrizeLabel,
  winnerNames,
  statusLabel,
  statusTone,
  canDrawCurrentPrize,
  canStopRaffle,
  primaryActionText,
  displayName,
  handleClose,
  handlePrimaryAction,
  handleStop
} = useAdminRaffleDrawStage(
  props,
  emit
)
</script>

<template>
  <van-popup
    v-model:show="showModel"
    position="bottom"
    :close-on-popstate="true"
    :style="{ height: '100vh', background: 'transparent' }"
  >
    <div class="h-full raffle-draw-stage">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.22),_transparent_45%),linear-gradient(180deg,#eff6ff_0%,#f8fafc_45%,#ffffff_100%)]" />

      <div class="relative z-10 flex h-full flex-col">
        <header class="px-4 pt-4 pb-3">
          <div class="glass-card px-4 py-3 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="flex">
                <p class="text-[10px] font-bold uppercase tracking-[0.25em]" :class="statusTone">{{ statusLabel }}</p>
              </div>
              <h2 class="text-lg font-black text-slate-900 truncate">
                {{ event?.title || '尚未選擇活動' }}
              </h2>
            </div>
            <van-button size="small" round plain icon="cross" @click="handleClose" />
          </div>
        </header>

        <main class="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
          <div class="glass-card p-4">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">目前獎項</p>
            <p class="text-2xl font-black text-sky-600">
              {{ currentPrizeLabel }}
            </p>
          </div>

          <div class="swipe-wrapper">
            <van-swipe
              v-if="nameList.length"
              v-model="currentIndex"
              vertical
              :autoplay="isRolling ? 100 : 0"
              :duration="50"
              :show-indicators="false"
              :loop="true"
              class="name-swipe"
            >
              <van-swipe-item
                v-for="(name, index) in nameList"
                :key="index"
                :class="{ 'is-active': index === currentIndex, 'is-winner': winnerNames.has(name) }"
              >
                <div class="name-text text-center">{{ displayName(name) }}</div>
              </van-swipe-item>
            </van-swipe>
            <div v-else class="name-empty text-center">尚無合格名單</div>
          </div>

          <section class="glass-card p-4 space-y-3">
            <van-button
              :loading="loading || drawing"
              :disabled="!canDrawCurrentPrize"
              :icon="isActive ? 'play-circle-o' : 'play-circle-o'"
              :text="primaryActionText"
              color="#0ea5e9"
              round
              size="large"
              @click="handlePrimaryAction"
            />
            <van-button
              v-if="isActive"
              plain
              round
              size="large"
              type="danger"
              text="結束抽獎"
              :disabled="!canStopRaffle"
              @click="handleStop"
            />
          </section>

          <section class="glass-card p-4 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">抽獎紀錄</p>
                <p class="text-sm font-bold text-slate-800">已抽出 {{ winners.length }} 位</p>
              </div>
              <AppIcon name="history" class="text-slate-400" size="md" />
            </div>

            <div v-if="winnersByRound.length" class="space-y-3">
              <div
                v-for="[round, items] in winnersByRound"
                :key="round"
                class="rounded-2xl border border-slate-200 bg-white/80 p-4 space-y-2"
              >
                <div class="flex items-center justify-between">
                  <p class="text-sm font-black text-slate-900">{{ getRoundPrizeLabel(round) }}</p>
                  <span class="text-xs font-bold text-slate-500">{{ items.length }} 位</span>
                </div>
                <div class="space-y-1">
                  <div
                    v-for="winner in items"
                    :key="winner.id"
                    class="flex items-center justify-between text-sm"
                  >
                    <span class="font-medium text-slate-700 truncate">
                      {{ winner.name || winner.user_id }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p class="text-sm font-bold text-slate-600">還沒有抽獎紀錄</p>
              <p class="text-xs text-slate-400 mt-1">開始第一輪後，結果會顯示在這裡。</p>
            </div>
          </section>
        </main>
      </div>

      <van-popup
        v-model:show="showWinnerPopup"
        round
        closeable
        class="winner-popup"
      >
        <div class="p-6 space-y-3">
          <p class="text-center text-xs font-bold text-slate-400 tracking-widest uppercase">中獎名單</p>
          <h3 class="text-center text-2xl font-black text-sky-700">恭喜中獎</h3>
          <div class="space-y-2">
            <p
              v-for="winner in latestWinners"
              :key="winner.id"
              class="text-center text-lg font-bold text-slate-800"
            >
              {{ winner.name || winner.user_id }}
            </p>
          </div>
        </div>
      </van-popup>
    </div>
  </van-popup>
</template>

<style scoped>
.raffle-draw-stage {
  position: relative;
  overflow: hidden;
}

.glass-card {
  @apply rounded-3xl border border-white/70 bg-white/55 backdrop-blur-xl shadow-[0_16px_50px_rgba(15,23,42,0.08)];
}

.winner-popup {
  width: min(88vw, 360px);
}

.lottery-roll-container {
  background: #ffffff;
  border-radius: 40px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 8px 24px rgba(219, 234, 254, 0.5);
}

.tag-wrapper {
  margin-bottom: 20px;
}

/* 輪播外層容器，限制可視高度 */
.swipe-wrapper {
  height: 240px; /* 根據畫面調整，約容納 4-5 行的高度 */
  overflow: hidden;
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Vant Swipe 樣式覆蓋 */
.name-swipe {
  height: 60px; /* 單行名字的高度 */
  width: 100%;
  position: relative;
  z-index: 3;
  overflow: visible !important; /* 關鍵：允許前後的項目顯示出來 */
}

:deep(.van-swipe__track) {
  overflow: visible !important;
}

:deep(.van-swipe-item) {
  position: relative;
  z-index: 3;
}

/* 每個名字的基礎樣式（未選中狀態） */
.name-text {
  font-size: 24px;
  font-weight: bold;
  color: #94a3b8; /* 灰色半透明感 */
  opacity: 0.4;
  transition: all 0.1s ease;
  height: 60px;
  line-height: 60px;
}

.name-empty {
  height: 60px;
  line-height: 60px;
  font-size: 20px;
  font-weight: 700;
  color: #94a3b8;
}

/* 當前選中（中間）的名字樣式 */
.is-active .name-text {
  position: relative;
  z-index: 4;
  font-size: 36px; /* 放大 */
  color: #026496; /* 圖片中的深藍色 */
  opacity: 1;
}

.is-winner .name-text {
  color: #c2410c;
  opacity: 1;
}

.is-winner.is-active .name-text {
  color: #b91c1c;
  text-shadow: 0 0 14px rgba(185, 28, 28, 0.18);
}

/* 加上漸層遮罩，讓上下邊緣的名字有漸隱效果 */
.swipe-wrapper::before,
.swipe-wrapper::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 60px;
  z-index: 1;
  pointer-events: none;
}
.swipe-wrapper::before {
  top: 0;
  background: linear-gradient(to bottom, rgba(255,255,255,1), rgba(255,255,255,0));
}
.swipe-wrapper::after {
  bottom: 0;
  background: linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0));
}
</style>
