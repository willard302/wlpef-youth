<script setup lang="ts">
interface Props {
  name?: string      // 可以透過 prop 傳入 icon 名稱
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  fill?: boolean     // 是否填充
  weight?: number    // 粗細: 100-700
  grade?: number     // 漸變: -25, 0, 200
  opticalSize?: number // 視覺大小調整: 20, 24, 40, 48
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  fill: false,
  weight: 400,
  grade: 0,
  opticalSize: 24
})

// 預設尺寸映射
const sizeMap = {
  xs: '16px',
  sm: '20px',
  md: '24px',
  lg: '32px',
  xl: '40px'
}

const iconSize = computed(() => {
  if (typeof props.size === 'number') return `${props.size}px`
  return sizeMap[props.size]
})

const fontVariationSettings = computed(() => {
  return `'FILL' ${props.fill ? 1 : 0}, 'wght' ${props.weight}, 'GRAD' ${props.grade}, 'opsz' ${props.opticalSize}`
})
</script>

<template>
  <span 
    class="material-symbols-outlined select-none shrink-0"
    :style="{ 
      fontSize: iconSize,
      fontVariationSettings: fontVariationSettings
    }"
  >
    <slot>{{ name }}</slot>
  </span>
</template>

<style scoped>
.material-symbols-outlined {
  display: inline-block;
  line-height: 1;
  text-transform: none;
  letter-spacing: normal;
  word-wrap: normal;
  white-space: nowrap;
  direction: ltr;
}
</style>
