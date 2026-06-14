<script setup lang="ts">
interface Props {
  modelValue: string
  label?: string
  type?: string
  placeholder?: string
  disabled?: boolean
  autocomplete?: string
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showPassword = ref(false)

const inputType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type
})
</script>

<template>
  <div class="space-y-1">
    <label v-if="label" class="text-white/80 text-sm font-medium pl-1">{{ label }}</label>
    <div class="relative">
      <AppIcon 
        v-if="icon" 
        :name="icon"
        size="sm"
        class="absolute left-4 top-1/2 -translate-y-1/2 text-white/50"
      />
      <input 
        :value="modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        :type="inputType" 
        :placeholder="placeholder"
        class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/50 transition-colors"
        :class="[
          icon ? 'pl-12' : '',
          type === 'password' ? 'pr-12' : ''
        ]"
        :disabled="disabled"
        :autocomplete="autocomplete"
      />

      <!-- Password Toggle -->
      <button
        v-if="type === 'password'"
        type="button"
        @click="showPassword = !showPassword"
        class="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors flex items-center justify-center"
      >
        <AppIcon 
          :name="showPassword ? 'visibility_off' : 'visibility'"
          size="sm"
        />
      </button>
    </div>
  </div>
</template>
