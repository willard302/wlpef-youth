<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg'
  glowIntensity?: number
  shadow?: boolean
  shadowColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'lg',
  glowIntensity: 10,
  shadow: true
})

const sizeClasses = {
  sm: {
    outer: 'size-12',
    middle: 'size-8',
    inner: 'size-4',
    glow: '0 0 15px rgba(255, 255, 255, 0.8)'
  },
  md: {
    outer: 'size-20',
    middle: 'size-14',
    inner: 'size-8',
    glow: '0 0 30px rgba(255, 255, 255, 0.6)'
  },
  lg: {
    outer: 'size-28',
    middle: 'size-20',
    inner: 'size-12',
    glow: `0 0 ${40}px ${10}px rgba(255, 255, 255, 0.5)`
  }
}

const current = sizeClasses[props.size]

const shadowClass = computed(() => {
  if (!props.shadow || props.shadowColor) return ''
  return 'shadow-lg'
})

const shadowStyle = computed(() => {
  if (!props.shadow || !props.shadowColor) return undefined

  return {
    boxShadow: `0 10px 15px -3px ${props.shadowColor}, 0 4px 6px -4px ${props.shadowColor}`
  }
})
</script>

<template>
  <div class="relative flex items-center justify-center">
    <div
      :class="[
        current.outer,
        'rounded-full flex items-center justify-center relative overflow-hidden',
        shadowClass
      ]"
      :style="shadowStyle"
    >
      <img 
        src="https://www.wlef.org/wp-content/uploads/2022/07/領袖會logo_大logo-02-300x293.png"
      />
    </div>
  </div>
</template>
