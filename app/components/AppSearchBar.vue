<script setup lang="ts">
interface Props {
  modelValue: string
  placeholder?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

withDefaults(defineProps<Props>(), {
  placeholder: '搜尋...'
})

defineEmits<Emits>()
</script>

<template>
  <section class="flex gap-2">
    <div class="relative flex-1">
      <AppIcon name="search" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        type="text"
        :placeholder="placeholder"
        class="w-full h-12 pl-12 pr-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-primary/50 outline-none text-sm"
      />
    </div>
    <slot name="right-icon" />
  </section>
</template>

<style scoped>
input {
  transition: all 0.2s;
}
</style>
