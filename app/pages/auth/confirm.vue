<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const { handleConfirmAuth, confirmLoading, confirmErrorMessage, confirmSuccessMessage } = useAuth()

onMounted(async () => {
  await handleConfirmAuth()
})
</script>

<template>
  <div class="flex flex-col items-center justify-center flex-1 px-8 text-center">
    <div class="glass-card w-full max-w-sm p-10 space-y-8">
      <div class="size-24 rounded-3xl flex items-center justify-center mx-auto text-primary">
        <van-loading v-if="confirmLoading" type="spinner" />
        <svg
          v-else-if="confirmErrorMessage"
          class="size-14 text-red-500"
          viewBox="0 0 24 24"
          fill="none"
          aria-label="錯誤"
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.25" />
          <path d="M12 7.5v5.25" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" />
          <circle cx="12" cy="16.5" r="1.2" fill="currentColor" />
        </svg>
        <svg
          v-else
          class="size-14 text-green-500"
          viewBox="0 0 24 24"
          fill="none"
          aria-label="成功"
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.25" />
          <path d="m8 12.25 2.55 2.55L16.5 8.85" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>

      <div class="space-y-3">
        <h1 class="text-white text-2xl font-bold tracking-tight">
          電子郵件確認
        </h1>
        
        <div v-if="confirmLoading" class="space-y-4">
          <p class="text-white/70">正在驗證您的電子郵件...</p>
          <div class="w-full bg-white/10 h-1 rounded-full overflow-hidden">
            <div class="bg-white h-full animate-progress-bar"></div>
          </div>
        </div>

        <p v-else-if="confirmErrorMessage" class="text-red-200 font-medium">
          {{ confirmErrorMessage }}
        </p>

        <p v-else-if="confirmSuccessMessage" class="text-green-200 font-medium">
          {{ confirmSuccessMessage }}
        </p>
      </div>

      <div class="pt-4">
        <NuxtLink 
          to="/auth" 
          class="inline-flex items-center gap-2 text-white/60 hover:text-white font-bold transition-colors"
        >
          <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5m0 0 6-6m-6 6 6 6" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>返回登入</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-spinner {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 9999px;
  border: 4px solid rgba(43, 157, 238, 0.22);
  border-top-color: #2b9dee;
  box-shadow: 0 0 24px rgba(255, 255, 255, 0.45);
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes progress-bar {
  0% { width: 0%; transform: translateX(-100%); }
  50% { width: 70%; transform: translateX(0); }
  100% { width: 100%; transform: translateX(100%); }
}

.animate-progress-bar {
  width: 100%;
  animation: progress-bar 2s infinite ease-in-out;
}
</style>
