<script setup lang="ts">
import { useTabbarConfig } from '@/composables/useTabbarConfig'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const { tabbarItems, activeIndex } = useTabbarConfig()
const { toasts, removeToast } = useToast()

const showTabbar = computed(() => {
  return route.meta.showTabbar !== false
})
</script>

<template>
  <div class="relative flex min-h-screen w-full flex-col max-w-[430px] mx-auto shadow-2xl bg-white overflow-y-auto overflow-x-hidden">
    <!-- 頁面內容 -->
    <div class="flex-1">
      <NuxtPage />
    </div>

    <!-- Toast 通知 -->
    <div class="absolute top-0 right-0 z-50 p-4 space-y-2 pointer-events-none">
      <Toast
        v-for="toast in toasts"
        :key="toast.id"
        :message="toast.message"
        :type="toast.type"
        :duration="toast.duration"
        class="pointer-events-auto"
        @close="removeToast(toast.id)"
      />
    </div>

    <!-- Tabbar -->
    <Tabbar v-if="showTabbar" :items="tabbarItems" :active-index="activeIndex" />
  </div>
</template>

<style scoped></style>
