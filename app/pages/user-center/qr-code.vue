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
        <div class="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-white relative overflow-hidden text-center">
          <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sky-400 to-indigo-400"></div>
          
          <div class="mb-6 inline-flex size-20 rounded-full bg-slate-100 items-center justify-center overflow-hidden border-4 border-white shadow-md">
            <img 
              v-if="userProfile.avatar" 
              :src="userProfile.avatar" 
              alt="Avatar" 
              class="size-full object-cover"
            />
            <span v-else class="material-symbols-outlined text-4xl text-slate-300">person</span>
          </div>

          <h2 class="text-2xl font-black text-slate-900 mb-1">{{ userProfile.name }}</h2>
          <p class="text-sky-500 font-bold text-sm tracking-widest uppercase mb-8">
            {{ userProfile.department || '尚未填寫單位' }}
          </p>

          <!-- QR Code Section -->
          <div class="relative inline-block p-6 bg-white rounded-3xl shadow-inner border border-slate-50">
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-full uppercase tracking-tighter">
              Check-in Pass
            </div>
            
            <div class="p-4 bg-white rounded-2xl">
              <qrcode-vue
                :value="qrValue"
                :size="200"
                level="H"
                render-as="svg"
                class="mx-auto"
                :margin="2"
              />
            </div>
            
            <div class="mt-4 flex items-center justify-center gap-2 text-slate-400">
              <span class="material-symbols-outlined text-sm">info</span>
              <span class="text-[11px] font-medium">活動當天出示此碼完成報到</span>
            </div>
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
              <span>若 QRCode 無法掃描，請提供您的姓名或手機號碼。</span>
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
</style>
