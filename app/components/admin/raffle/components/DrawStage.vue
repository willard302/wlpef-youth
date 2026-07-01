<script setup lang="ts">
import type { DrawStageEvent, RafflePrizeSetting, RaffleWinnerRow } from '~/types'
import { normalizeRafflePrizeSettings } from '~/utils/raffle'

const props = defineProps<{
  show: boolean
  event: DrawStageEvent | null
  candidateCount: number | null
  winners: RaffleWinnerRow[]
  prizeRows: RafflePrizeSetting[]
  prizeDirty: boolean
  withinWindow: boolean
  isActive: boolean
  loading: boolean
  drawing: boolean
  onStart: () => Promise<void>
  onStop: () => Promise<void>
  onDrawOne: () => Promise<boolean>
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const nameList = ref([
  '吳林勳', '蔡明惠', '陳建中', '林俊翔', '王大明', 
  '張小芬', '李成果', '趙四方', '劉德華', '張學友'
]);

const currentIndex = ref(0);
const isRolling = ref(false); // 控制是否正在滾動
const showWinnerPopup = ref(false)
const latestWinners = ref<RaffleWinnerRow[]>([])
const drawStartWinnerCount = ref(0)

const winnerNames = computed(() => {
  return new Set(
    latestWinners.value.map(winner => winner.name || winner.user_id).filter(Boolean)
  )
})

const maskName = (name:string) => {
  if (!name) return '';
  if (name.length <= 2) {
    return name.substring(0, 1) + '○';
  }
  return name.substring(0, 1) + '○' + name.substring(2);
};

const displayName = (name: string) => {
  return winnerNames.value.has(name) ? name : maskName(name)
}

const showModel = computed({
  get: () => props.show,
  set: value => emit('update:show', value),
})

const winnersByRound = computed(() => {
  const map = new Map<number, RaffleWinnerRow[]>()
  for (const winner of props.winners) {
    const items = map.get(winner.round) ?? []
    items.push(winner)
    map.set(winner.round, items)
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0])
})

const nextRound = computed(() => props.winners.reduce((max, winner) => Math.max(max, winner.round), 0) + 1)

const orderedPrizeRows = computed(() => normalizeRafflePrizeSettings(props.prizeRows))

const currentPrize = computed(() => {
  return orderedPrizeRows.value[nextRound.value - 1] ?? null
})

const currentPrizeLabel = computed(() => {
  if (!props.event) return '尚未選擇活動'
  if (!orderedPrizeRows.value.length) return '尚未設定獎項'
  if (!currentPrize.value) return nextRound.value > orderedPrizeRows.value.length ? '已抽完所有獎項' : '未設定獎項'
  return `${currentPrize.value.prize}：${formatPrizeLabel(currentPrize.value)}`
})

const statusLabel = computed(() => {
  if (props.isActive) return '抽獎進行中'
  if (props.event) return '等待開始'
  return '尚未選擇活動'
})

const statusTone = computed(() => {
  if (props.isActive) return 'bg-emerald-100 text-emerald-700'
  if (props.event) return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-500'
})

const handleClose = () => {
  showModel.value = false
}

const handleStart = async() => {
  if (props.isActive) return
  if (!props.withinWindow) {
    try {
      await showConfirmDialog({
        title: '不在活動時段',
        message: '現在不在此活動的時間窗內（活動前 30 分 ~ 結束後 30 分），一般使用者的頁面不會輪詢、收不到中獎通知。仍要開始抽獎嗎？',
        confirmButtonText: '仍要開始',
        confirmButtonColor: '#f59e0b',
      })
    }
    catch {
      return
    }
  }

  await props.onStart()
}

const formatPrizeLabel = (prize: RafflePrizeSetting) => {
  return prize.name || '未命名獎項'
}

const handlePrimaryAction = async() => {
  if (isRolling.value) {
    isRolling.value = false
    return
  }

  if (!props.isActive) {
    await handleStart()
  }

  isRolling.value = true

  await nextTick()
  if (!props.isActive) return

  if (props.prizeDirty) {
    return
  }

  await props.onDrawOne()
}

watch(
  () => props.drawing,
  (isDrawing, wasDrawing) => {
    if (isDrawing) {
      drawStartWinnerCount.value = props.winners.length
      isRolling.value = true
      return
    }

    if (!wasDrawing) return
    const appended = props.winners.slice(drawStartWinnerCount.value)
    if (!appended.length) return

    latestWinners.value = appended
    isRolling.value = false

    const firstWinnerName = appended[0] ? (appended[0].name || appended[0].user_id) : ''
    if (firstWinnerName) {
      const existingIndex = nameList.value.findIndex(name => name === firstWinnerName)
      if (existingIndex === -1) {
        nameList.value.unshift(firstWinnerName)
        currentIndex.value = 0
      }
      else {
        currentIndex.value = existingIndex
      }
    }

    showWinnerPopup.value = true
  }
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
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em]">抽獎介面</p>
              <h2 class="text-lg font-black text-slate-900 truncate">
                {{ event?.title || '尚未選擇活動' }}
              </h2>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-3 py-1 rounded-full text-xs font-bold" :class="statusTone">
                {{ statusLabel }}
              </span>
              <van-button size="small" round plain icon="cross" @click="handleClose" />
            </div>
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
                :class="{ 'is-winner': winnerNames.has(name) }"
              >
                <div class="name-text text-center">{{ displayName(name) }}</div>
              </van-swipe-item>
            </van-swipe>
          </div>

          <section class="glass-card p-4 space-y-3">
            <van-button
              :loading="loading || drawing"
              :disabled="prizeDirty"
              :icon="isActive ? 'play-circle-o' : 'play-circle-o'"
              :text="isRolling ? '停止' : '開始'"
              color="#0ea5e9"
              round
              size="large"
              @click="handlePrimaryAction"
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
                  <p class="text-sm font-black text-slate-900">第 {{ round }} 輪</p>
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
                    <span class="text-xs text-slate-400">{{ winner.created_at }}</span>
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
