<script setup lang="ts">
interface Props {
  title: string
  showBack?: boolean
}

withDefaults(defineProps<Props>(), {
  showBack: true
})

const emit = defineEmits<{
  back: []
}>()
</script>

<template>
  <AppHeaderBase
    variant="page"
    :title="title"
    :show-back="showBack"
    @back="emit('back')"
  >
    <template #actions>
      <slot name="right-actions" />
    </template>
  </AppHeaderBase>
</template>
