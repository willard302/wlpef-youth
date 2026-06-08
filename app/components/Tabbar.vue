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
  <nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 backdrop-blur-md px-4 pb-4 pt-4 z-50 border-t border-sky-50">
    <div class="flex justify-around items-center">
      <NuxtLink
        v-for="(item, index) in items"
        :key="item.key"
        :to="item.path"
        @click="handleItemClick(item, $event)"
        class="flex flex-col items-center gap-1 transition-colors"
        :class="[
          index === activeIndex
            ? 'text-sky-600'
            : 'text-slate-300 hover:text-sky-400'
        ]"
      >
        <span
          class="material-symbols-outlined text-2xl"
          :style="{ fontVariationSettings: item.fill ? `'FILL' 1` : `'FILL' 0` }"
        >
          {{ item.icon }}
        </span>
        <span class="text-[9px] font-bold uppercase tracking-tighter">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<style scoped>
nav {
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}
</style>
