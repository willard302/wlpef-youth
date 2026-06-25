<script setup lang="ts">
interface Props {
  placeholder?: string
}

withDefaults(defineProps<Props>(), {
  placeholder: '搜尋...'
})

const modelValue = defineModel<string>({
  default: ''
})
</script>

<template>
  <div class="relative w-full">
    <AppIcon name="search" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
    <input 
      v-model="modelValue"
      type="text"
      placeholder="搜尋姓名、Email 或活動..."
      class="w-full h-12 pl-12 pr-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-primary/50 outline-none text-sm"
    />
  </div>
</template>

<style scoped></style>
