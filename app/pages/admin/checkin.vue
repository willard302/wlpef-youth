<script setup lang="ts">
import CheckInDetailModal from './components/CheckInDetailModal.vue'
import { useCheckin } from '~/composables/useCheckin'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'scanner-access'],
})

const { 
  events, 
  selectedEventId, 
  isLoading, 
  isCameraActive, 
  scanResult,
  scannedMemberId,
  isScanning,
  loadEvents,
  startScanner,
  stopScanner,
  loadScanAudio
} = useCheckin()


onMounted(() => {
  loadScanAudio()
  loadEvents()
})

onUnmounted(async () => {
  await stopScanner()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20">
    <AppHeaderPage title="活動簽到掃描" show-back />

    <main class="px-4 pt-6 space-y-6">
      <!-- Step 1: Select Event -->
      <section class="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <div v-if="!isCameraActive" class="flex items-center gap-3 mb-4 text-slate-400">
          <AppIcon name="event_note" />
          <h3 class="text-sm font-bold uppercase tracking-widest">第一步：選擇活動</h3>
        </div>

        <AppLoading v-if="isLoading" class="py-4" />

        <div v-else-if="events.length === 0" class="py-4 text-center">
          <p class="text-sm text-slate-400">目前沒有可簽到的活動</p>
        </div>
        <div v-else class="space-y-4">
          <select 
            v-model="selectedEventId"
            class="w-full bg-slate-50 border-0 rounded-2xl p-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 outline-none"
          >
            <option v-for="event in events" :key="event.id" :value="event.id">
              {{ event.title }}
            </option>
          </select>
        </div>
      </section>

      <!-- Step 2: Scan QR Code -->
      <section class="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 overflow-hidden">
        <div v-if="!isCameraActive" class="flex items-center gap-3 mb-6 text-slate-400">
          <AppIcon name="qr_code_scanner" />
          <h3 class="text-sm font-bold uppercase tracking-widest">第二步：掃描會員</h3>
        </div>

        <div id="reader" class="rounded-2xl overflow-hidden border-0 bg-slate-100"></div>

        <div class="mt-6 flex flex-col items-center gap-3">
          <button
            @click="isCameraActive ? stopScanner() : startScanner()"
            class="w-full h-14 rounded-2xl bg-sky-500 text-white font-bold shadow-lg shadow-sky-200 active:scale-95 transition-all flex items-center justify-center gap-2"
            :class="{ 'bg-rose-500 shadow-rose-200': isCameraActive }"
          >
            <AppIcon :name="isCameraActive ? 'videocam_off' : 'photo_camera'" />
            {{ isCameraActive ? '停止掃描' : '啟動相機' }}
          </button>  
          <p class="text-[10px] text-slate-400 text-center font-medium">
            {{ isCameraActive ? '請將會員的 QR Code 對準掃描框。' : '點擊按鈕啟動相機開始掃描。' }}<br>掃描成功後系統會自動完成簽到。
          </p>
        </div>

        <!-- Check in detail modal -->
        <CheckInDetailModal 
          v-if="scanResult"
          :scan-result="scanResult"
          :scanned-member-id="scannedMemberId"
        />
      </section>
    </main>
    <div v-if="isScanning" class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center">
      <div class="size-20 flex items-center justify-center animate-bounce mb-16">
        <img src="/images/shooting-man.png" />
      </div>
      <h2 class="text-xl font-bold mb-2">簽到處理中...</h2>
      <p class="text-white/60 text-sm">正在驗證會員資料、報名與繳費狀態</p>
    </div>
  </div>
</template>

<style scoped>
/* html5-qrcode overrides */
#reader :deep(video) {
  width: 100%;
  object-fit: cover;
  border-radius: 1rem;
}
</style>
