<script setup lang="ts">
import type { RaffleWinDisplay } from '~/types'

defineProps<{
  open: boolean
  wins?: RaffleWinDisplay[]
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="raffle-win-modal">
      <div
        v-if="open"
        class="fixed inset-0 z-[200] flex items-center justify-center px-6"
        @click.self="emit('close')"
      >
        <!-- 背景遮罩 -->
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-md" @click="emit('close')" />

        <!-- 彈窗卡片 -->
        <div class="relative z-10 w-full max-w-sm rounded-3xl border border-white/60 bg-white/70 p-8 text-center space-y-5 shadow-2xl backdrop-blur-xl">
          <LogoIcon />

          <div class="space-y-1">
            <h2 class="text-2xl font-black text-slate-900">恭喜中獎！</h2>
            <p class="text-sm text-slate-500">您已被選為本次抽獎的幸運得主！</p>
          </div>

          <!-- 中獎獎項 -->
          <p v-if="wins?.length" class="text-sm font-bold text-emerald-600">
            中獎獎項：{{ wins.map(win => win.label).join('、') }}
          </p>

          <van-button round block color="#0284c7" @click="emit('close')">
            太棒了
          </van-button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.raffle-win-modal-enter-active,
.raffle-win-modal-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.raffle-win-modal-enter-from,
.raffle-win-modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
