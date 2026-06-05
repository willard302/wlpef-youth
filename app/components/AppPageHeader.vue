<script setup lang="ts">
interface Props {
  title: string
  showBack?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showBack: true
})

const emit = defineEmits<{
  back: []
}>()

const handleBack = () => {
  emit('back')
}
</script>

<template>
  <header class="flex items-center justify-between px-4 py-4 bg-white/50 backdrop-blur-md sticky top-0 z-10 border-b border-sky-500/10 w-full">
    <div class="flex items-center gap-3">
      <button 
        v-if="showBack"
        @click="handleBack" 
        class="text-slate-900 flex items-center justify-center p-2 rounded-lg hover:bg-sky-500/10 transition-colors"
      >
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div class="flex flex-col">
        <h1 class="text-xs font-bold text-sky-500 tracking-wider uppercase">領袖會社青團</h1>
        <h2 class="text-lg font-bold text-slate-900 leading-tight">{{ title }}</h2>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <slot name="right-actions" />
    </div>
  </header>
</template>

<style scoped>
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>
