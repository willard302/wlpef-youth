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
  rows?: number // For textarea type
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
      <i v-if="icon && (type === 'textarea' || type === 'select')" class="material-symbols-outlined text-lg text-slate-400">{{ icon }}</i>
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="relative group">
      <slot v-if="hasCustomField" />

      <template v-else>
      <!-- Icon for standard inputs (centered) -->
      <i v-if="icon && type !== 'textarea' && type !== 'select'" class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
        {{ icon }}
      </i>

      <!-- Standard Input -->
      <input
        v-if="type !== 'textarea' && type !== 'select'"
        :value="modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :type="inputType"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :disabled="disabled"
        class="block w-full pl-12 py-3.5 rounded-2xl border-none bg-white/80 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50 shadow-sm transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        :class="type === 'password' ? 'pr-12' : 'pr-4'"
      />

      <!-- Textarea -->
      <textarea
        v-else-if="type === 'textarea'"
        :value="modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        :placeholder="placeholder"
        :disabled="disabled"
        :rows="rows || 3"
        class="block w-full px-4 py-3.5 rounded-2xl border-none bg-white/80 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50 shadow-sm transition-all outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
      ></textarea>

      <!-- Select -->
      <div v-else-if="type === 'select'" class="relative">
        <select
          :value="modelValue"
          @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
          :disabled="disabled"
          class="block w-full px-4 h-12 rounded-2xl border-none bg-white/80 text-slate-900 focus:ring-2 focus:ring-primary/50 shadow-sm transition-all outline-none appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="" disabled selected v-if="placeholder">{{ placeholder }}</option>
          <option v-for="opt in options" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <i class="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          expand_more
        </i>
      </div>

      <!-- Password Toggle Button -->
      <button
        v-if="type === 'password'"
        @click="showPassword = !showPassword"
        type="button"
        class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        :aria-label="showPassword ? '隱藏密碼' : '顯示密碼'"
      >
        <i class="material-symbols-outlined">{{ showPassword ? 'visibility_off' : 'visibility' }}</i>
      </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
i {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>
