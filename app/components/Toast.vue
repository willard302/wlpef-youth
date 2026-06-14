<script setup lang="ts">
interface Props {
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 3000
})

const emit = defineEmits<{
  close: []
}>()

const isVisible = ref(true)

const close = () => {
  isVisible.value = false
  emit('close')
}

// 自動關閉
if (props.duration > 0) {
  setTimeout(() => {
    close()
  }, props.duration)
}

const getToastClasses = () => {
  const baseClasses = 'fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 max-w-sm'

  switch (props.type) {
    case 'success':
      return `${baseClasses} bg-green-500 text-white`
    case 'error':
      return `${baseClasses} bg-red-500 text-white`
    case 'info':
    default:
      return `${baseClasses} bg-blue-500 text-white`
  }
}

const getIcon = () => {
  switch (props.type) {
    case 'success':
      return 'check_circle'
    case 'error':
      return 'error'
    case 'info':
    default:
      return 'info'
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 transform translate-x-full"
    enter-to-class="opacity-100 transform translate-x-0"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="opacity-100 transform translate-x-0"
    leave-to-class="opacity-0 transform translate-x-full"
  >
    <div v-if="isVisible" :class="getToastClasses()">
      <AppIcon 
        :name="getIcon()" 
        fill 
        size="sm"
        class="flex-shrink-0"
      />
      <p class="text-sm font-medium flex-1">{{ message }}</p>
      <button
        @click="close"
        class="flex-shrink-0 hover:bg-white/20 rounded-full p-1 transition-colors"
      >
        <AppIcon name="close" :size="16" />
      </button>
    </div>
  </Transition>
</template>