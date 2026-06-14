<script setup lang="ts">
interface Props {
  type?: 'button' | 'submit'
  variant?: 'glass' | 'primary'
  loading?: boolean
  disabled?: boolean
  icon?: string
  google?: boolean
}

withDefaults(defineProps<Props>(), {
  type: 'button',
  variant: 'glass',
  loading: false,
  disabled: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="auth-button w-full relative flex items-center justify-center gap-3 h-14 rounded-2xl font-bold transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 overflow-hidden"
    :class="[
      variant === 'glass' ? 'bg-white/10 backdrop-blur-md text-white border border-white/20' : 'bg-primary text-white border-none shadow-lg shadow-primary/20'
    ]"
    @click="emit('click', $event)"
  >
    <!-- Background Shine Effect -->
    <div class="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

    <van-loading v-if="loading" type="spinner" size="20px" :color="variant === 'glass' ? '#ffffff' : '#ffffff'" />
    
    <template v-else>
      <div v-if="google" class="google-logo size-6 shrink-0" />
      <AppIcon v-else-if="icon" size="md" class="shrink-0">{{ icon }}</AppIcon>
      <span class="tracking-wide"><slot /></span>
    </template>
  </button>
</template>

<style scoped>
.auth-button {
  -webkit-tap-highlight-color: transparent;
}

.auth-button:not(:disabled):hover {
  transform: translateY(-2px);
}

.auth-button:not(:disabled).bg-white\/10:hover {
  background-color: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.3);
}

.auth-button:not(:disabled).bg-primary:hover {
  filter: brightness(1.1);
  box-shadow: 0 10px 25px -5px rgba(43, 157, 238, 0.4);
}

.google-logo {
  background-image: url('/images/google-logo.svg');
  background-size: cover;
  background-position: center;
}
</style>
