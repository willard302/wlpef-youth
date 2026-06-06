<script setup lang="ts">
import QrcodeVue from 'qrcode.vue'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
})

const router = useRouter()
const { userProfile, loadUserData, isLoading } = useUser()

onMounted(async () => {
  if (!userProfile.value) {
    await loadUserData()
  }
})

const qrValue = computed(() => userProfile.value?.id || '')
</script>

<template>
  <div class="qr-code-page pb-24 min-h-screen bg-slate-50">
    <AppPageHeader title="我的報到碼" show-back @back="router.back()" />

    <main class="px-6 pt-8">
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
        <div class="size-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-slate-500 font-medium">載入報到碼中...</p>
      </div>

      <div v-else-if="userProfile" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <!-- User Info Card -->
         
        <!-- QR Code Section -->
        <div class="p-4 bg-white rounded-2xl shadow-md border border-slate-200 text-center qr-code-card">
          <qrcode-vue
            :value="qrValue"
            :size="200"
            level="H"
            render-as="svg"
            class="mx-auto"
            :margin="2"
          />
          <div class="mt-4 flex items-center justify-center gap-2 text-slate-400">
            <span class="material-symbols-outlined text-sm">info</span>
            <span class="text-[11px] font-medium">活動當天出示此碼完成報到</span>
          </div>
        </div>

        <!-- Instructions -->
        <div class="bg-sky-50/50 rounded-3xl p-6 border border-sky-100">
          <h3 class="text-sky-900 font-bold text-sm mb-3 flex items-center gap-2">
            <span class="material-symbols-outlined text-sky-500">lightbulb</span>
            報到說明
          </h3>
          <ul class="space-y-3 text-xs text-sky-800/70 font-medium leading-relaxed">
            <li class="flex gap-2">
              <span class="text-sky-400 font-bold">01.</span>
              <span>請於活動報到處主動出示此 QRCode。</span>
            </li>
            <li class="flex gap-2">
              <span class="text-sky-400 font-bold">02.</span>
              <span>工作人員掃描成功後，系統將自動發放參與點數。</span>
            </li>
            <li class="flex gap-2">
              <span class="text-sky-400 font-bold">03.</span>
              <span>若 QRCode 無法掃描，請提供您報名用的Email。</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.qr-code-page {
  background-color: #f8fafc;
}
.qr-code-card {
  width: 270px;
  margin: 0 auto;
}
</style>
