<script setup lang="ts">
const slots = useSlots()

const props = defineProps<{
  modelValue?: string
  type?: string
  placeholder?: string
  icon?: string
  autocomplete?: string
  disabled?: boolean
  label?: string
  required?: boolean
  options?: { label: string; value: string }[] // For select type
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showPassword = ref(false)
const hasCustomField = computed(() => Boolean(slots.default))

const inputType = computed(() => {
  if (props.type === 'password') return showPassword.value ? 'text' : 'password'
  return props.type ?? 'text'
})
</script>

<template>
  <div class="space-y-2">
    <label v-if="label" class="text-sm font-semibold text-slate-700 ml-1 flex items-center gap-2">
      <AppIcon 
        v-if="icon && (type === 'textarea' || type === 'select')" 
        :name="icon"
        class="text-slate-400" 
        :size="18" 
      />
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="relative group">
      <slot v-if="hasCustomField" />

      <template v-else>
      <!-- Icon for standard inputs (centered) -->
      <AppIcon 
        :name="icon"
        class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"
      />

      <!-- Standard Input -->
      <input
        :value="modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :type="inputType"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :disabled="disabled"
        class="block w-full pl-12 py-3.5 rounded-2xl border-none bg-white/80 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50 shadow-sm transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        :class="type === 'password' ? 'pr-12' : 'pr-4'"
      />

      <!-- Password Toggle Button -->
      <button
        v-if="type === 'password'"
        @click="showPassword = !showPassword"
        type="button"
        class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        :aria-label="showPassword ? '隱藏密碼' : '顯示密碼'"
      >
        <AppIcon :name="showPassword ? 'visibility_off' : 'visibility'" />
      </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
</style>
