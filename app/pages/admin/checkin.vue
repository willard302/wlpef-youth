<script setup lang="ts">
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { eventService } from '@/services/eventService'
import type { Event } from '@/types'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
  showTabbar: false,
})

const events = ref<Event[]>([])
const selectedEventId = ref('')
const isLoading = ref(true)
const isScanning = ref(false)
const lastScannedId = ref('')
const { addToast } = useToast()

let scanner: Html5QrcodeScanner | null = null

const loadEvents = async () => {
  try {
    isLoading.value = true
    // 獲取近期與進行中的活動
    const ongoing = await eventService.fetchOngoingEvents()
    const upcoming = await eventService.fetchUpcomingEvents(10)
    
    // 合併並去重
    const combined: Event[] = [...ongoing]
    upcoming.forEach(u => {
      if (!combined.find(c => c.id === u.id)) {
        combined.push(u)
      }
    })
    
    events.value = combined
    if (combined[0] && combined.length > 0) {
      selectedEventId.value = combined[0].id
    }
  } catch (err: any) {
    addToast(err.message || '載入活動失敗', 'error')
  } finally {
    isLoading.value = false
  }
}

const onScanSuccess = async (decodedText: string) => {
  if (isScanning.value) return
  
  // 避免重複掃描同一個 ID 太快
  if (decodedText === lastScannedId.value) return
  
  try {
    isScanning.value = true
    lastScannedId.value = decodedText
    
    // 假設 decodedText 就是 memberId (UUID)
    await eventService.checkInMember(selectedEventId.value, decodedText)
    
    addToast('簽到成功！', 'success')
    
    // 震動回饋 (如果支援)
    if ('vibrate' in navigator) {
      navigator.vibrate(200)
    }
    
    // 稍微延遲一下再允許下次掃描
    setTimeout(() => {
      lastScannedId.value = ''
      isScanning.value = false
    }, 2000)
    
  } catch (err: any) {
    addToast(err.message || '簽到失敗', 'error')
    isScanning.value = false
    // 失敗的話也清除 lastScannedId 讓它可以重新掃描
    setTimeout(() => {
      lastScannedId.value = ''
    }, 3000)
  }
}

const onScanFailure = (error: any) => {
  // 靜默處理失敗 (掃描中很常發生)
}

const startScanner = () => {
  if (!selectedEventId.value) {
    addToast('請先選擇活動', 'info')
    return
  }

  // 清除舊的
  if (scanner) {
    scanner.clear()
  }

  scanner = new Html5QrcodeScanner(
    'reader',
    { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
    },
    /* verbose= */ false
  )
  
  scanner.render(onScanSuccess, onScanFailure)
}

onMounted(() => {
  loadEvents()
})

onUnmounted(() => {
  if (scanner) {
    scanner.clear()
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20">
    <AppHeaderPage title="活動簽到掃描" show-back />

    <main class="px-4 pt-6 space-y-6">
      <!-- Step 1: Select Event -->
      <section class="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <div class="flex items-center gap-3 mb-4 text-slate-400">
          <span class="material-symbols-outlined">event_note</span>
          <h3 class="text-sm font-bold uppercase tracking-widest">第一步：選擇活動</h3>
        </div>

        <div v-if="isLoading" class="py-4 flex justify-center">
          <div class="size-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
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
        <div class="flex items-center gap-3 mb-6 text-slate-400">
          <span class="material-symbols-outlined">qr_code_scanner</span>
          <h3 class="text-sm font-bold uppercase tracking-widest">第二步：掃描會員</h3>
        </div>

        <div id="reader" class="rounded-2xl overflow-hidden border-0 bg-slate-100"></div>

        <div class="mt-6 flex flex-col items-center gap-3">
          <button
            @click="startScanner"
            class="w-full h-14 rounded-2xl bg-sky-500 text-white font-bold shadow-lg shadow-sky-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span class="material-symbols-outlined">photo_camera</span>
            啟動相機
          </button>
          <p class="text-[10px] text-slate-400 text-center font-medium">
            請將會員的 QR Code 對準掃描框。<br>掃描成功後系統會自動完成簽到。
          </p>
        </div>
      </section>

      <!-- Status Info -->
      <div v-if="isScanning" class="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center">
        <div class="size-20 bg-sky-500 rounded-3xl flex items-center justify-center mb-6 animate-bounce">
          <span class="material-symbols-outlined text-4xl">sync</span>
        </div>
        <h2 class="text-xl font-bold mb-2">簽到處理中...</h2>
        <p class="text-white/60 text-sm">正在驗證會員資料並發放點數</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* html5-qrcode overrides */
#reader :deep(button) {
  @apply bg-sky-500 text-white border-0 px-4 py-2 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all;
}
#reader :deep(select) {
  @apply bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium outline-none mb-2;
}
#reader :deep(img) {
  display: none;
}
</style>
