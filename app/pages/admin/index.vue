<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
  showTabbar: false,
})
</script>

<template>
  <div>
    Page: admin/index
  </div>
</template>

<style scoped></style>
