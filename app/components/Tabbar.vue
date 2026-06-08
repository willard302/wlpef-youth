<script setup lang="ts">
import type { TabbarItem } from '@/types'

interface Props {
  items: TabbarItem[]
  activeIndex?: number
}

withDefaults(defineProps<Props>(), {
  activeIndex: 0
})

const emit = defineEmits<{
  'qr-click': []
}>()

const handleItemClick = (item: TabbarItem, event: Event) => {
  if (item.key === 'qr-code') {
    event.preventDefault()
    emit('qr-click')
  }
}
</script>

<template>
  <nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 backdrop-blur-md px-4 pb-4 pt-4 z-50 border-t border-sky-50 h-[84px]">
    <div class="flex justify-around items-end h-full">
      <NuxtLink
        v-for="(item, index) in items"
        :key="item.key"
        :to="item.path"
        @click="handleItemClick(item, $event)"
        class="flex flex-col items-center gap-1 transition-all duration-300 relative"
        :class="[
          (item.key === 'qr-code' || item.key === 'scan') 
            ? 'qr-code-tab-item' 
            : (index === activeIndex ? 'text-sky-600' : 'text-slate-300 hover:text-sky-400')
        ]"
      >
        <button
          v-if="['qr-code', 'scan'].includes(item.key)"
          class="sphere-btn relative flex items-center justify-center overflow-hidden transition-all duration-200 active:scale-95"
          :class="['w-20 h-20']"
        >
          <span class="ripple"></span>
          <span class="z-10 text-white drop-shadow-md">
            <slot>Scan</slot>
          </span>
        </button>
        <template v-else>
          <span
            class="material-symbols-outlined text-2xl"
            :style="{ fontVariationSettings: item.fill ? `'FILL' 1` : `'FILL' 0` }"
          >
            {{ item.icon }}
          </span>
          <span class="text-[9px] font-bold uppercase tracking-tighter">{{ item.label }}</span>
        </template>
      </NuxtLink>
    </div>
  </nav>
</template>

<style scoped lang="scss">
nav {
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}
.sphere-btn {
  background-color: #7DD3FC;
  // background-color: currentColor;
  
  /* 核心：使用多層背景疊加光影 */
  background-image: 
    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5) 0%, transparent 40%),
    radial-gradient(circle at 70% 70%, rgba(0,0,0,0.15) 0%, transparent 60%);
  
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 10px 15px -3px rgba(125, 211, 252, 0.4), 
    inset 0 -5px 5px rgba(0, 0, 0, 0.1);
  
  position: relative;
  cursor: pointer;
}

/* 漣漪效果的初始狀態 */
.ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
}

/* 點擊時觸發動畫 */
.sphere-btn:active .ripple {
  animation: ripple-effect 0.6s linear;
}

@keyframes ripple-effect {
  0% { width: 0; height: 0; opacity: 0.5; }
  100% { width: 200%; height: 200%; opacity: 0; }
}
</style>
