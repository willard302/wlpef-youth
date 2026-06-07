<script setup lang="ts">
interface Props {
  title: string
  eyebrow?: string
  heightClass?: string
  showBack?: boolean
}

withDefaults(defineProps<Props>(), {
  eyebrow: '領袖會社青團',
  heightClass: 'h-56',
  showBack: false
})
</script>

<template>
  <AppHeaderBase
    variant="hero"
    :title="title"
    :eyebrow="eyebrow"
    :show-back="showBack"
    :height-class="heightClass"
  >
    <template #actions>
      <slot name="actions" />
    </template>

    <slot />
  </AppHeaderBase>
</template>
