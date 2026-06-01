<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  type?: 'text' | 'email' | 'password'
  placeholder?: string
  icon: string
  autocomplete?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showPassword = ref(false)
const inputType = computed(() => {
  if (props.type === 'password') return showPassword.value ? 'text' : 'password'
  return props.type ?? 'text'
})
</script>

<template>
  <div class="relative group">
    <i class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
      {{ icon }}
    </i>
    <input
      :value="modelValue"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :type="inputType"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      class="block w-full pl-12 py-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
      :class="type === 'password' ? 'pr-12' : 'pr-4'"
    />
    <button
      v-if="type === 'password'"
      @click="showPassword = !showPassword"
      type="button"
      class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      :aria-label="showPassword ? '隱藏密碼' : '顯示密碼'"
    >
      <i class="material-symbols-outlined">{{ showPassword ? 'visibility_off' : 'visibility' }}</i>
    </button>
  </div>
</template>

<style scoped>
i {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>
