<script setup lang="ts">
interface Props {
  title: string
  eyebrow?: string
  showBack?: boolean
}

withDefaults(defineProps<Props>(), {
  eyebrow: '領袖會社青團',
  showBack: true
})
</script>

<template>
  <AppHeaderBase
    variant="page"
    :title="title"
    :eyebrow="eyebrow"
    :show-back="showBack"
  >
    <template #actions>
      <slot name="actions" />
    </template>
  </AppHeaderBase>
</template>
