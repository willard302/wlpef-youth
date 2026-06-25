<script setup lang="ts">
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import type { Event, CheckinScanResult } from '~/types'
import CheckInDetailModal from './components/CheckInDetailModal.vue'
import { eventService } from '~/services/event'
import { eventAdminService } from '~/services/eventAdmin'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'scanner-access'],
})

const events = ref<Event[]>([])
const selectedEventId = ref('')
const isLoading = ref(true)
const isScanning = ref(false)
const isCameraActive = ref(false)
const lastScannedId = ref('')
const scanResult = ref<CheckinScanResult | null>(null)
const scannedMemberId = ref('')
const { addToast } = useToast()

let html5QrCode: Html5Qrcode | null = null
let audioCtx: AudioContext | null = null
let successBuffer: AudioBuffer | null = null
let failureBuffer: AudioBuffer | null = null

const loadEvents = async () => {
  try {
    isLoading.value = true
    
    events.value = await eventService.fetchOngoingEvents()

    if (events.value.length === 0) {
      events.value = await eventService.fetchUpcomingEvents()
    } 

    if (!events.value[0] || events.value.length <= 0) return

    selectedEventId.value = events.value[0].id
  } catch (err: any) {
    addToast(err.message || '載入活動失敗', 'error')
  } finally {
    isLoading.value = false
  }
}

const onScanSuccess = async (decodedText: string) => {
  if (isScanning.value) return
  if (decodedText === lastScannedId.value) return
  
  try {
    isScanning.value = true
    lastScannedId.value = decodedText
    scannedMemberId.value = decodedText
    scanResult.value = null
    
    const result = await eventAdminService.checkInMember(selectedEventId.value, decodedText)
    scanResult.value = result

    if (result.hasAnyPayment) {
      playScanAudio('success')
    } else {
      playScanAudio('failure')
    }

    if ('vibrate' in navigator) {
      navigator.vibrate(200)
    }

    setTimeout(() => {
      lastScannedId.value = ''
      isScanning.value = false
    }, 1500)

    addToast(result.paymentMessage, result.hasAnyPayment ? 'success' : 'error')
    
  } catch (err: any) {
    addToast(err.message || '簽到失敗', 'error')
    playScanAudio('failure')
    isScanning.value = false
    setTimeout(() => {
      lastScannedId.value = ''
    }, 2000)
  }
}

const onScanFailure = (error: any) => {
  // 靜默處理失敗 (掃描中很常發生)
}

const startScanner = async () => {
  if (!selectedEventId.value) {
    addToast('請先選擇活動', 'info');
    return;
  }

  try {

    await eventAdminService.verifyOperatorScanPermission()

    if (html5QrCode) await stopScanner()

    html5QrCode = new Html5Qrcode('reader', {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false
    })
    
    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      onScanSuccess,
      onScanFailure
    )

    isCameraActive.value = true
  } catch (err: any) {
    console.error('Failed to start scanner', err)
    addToast(`啟動相機失敗，${err.message}`, 'error')
  }
}

const stopScanner = async () => {
  if (html5QrCode) {
    try {
      // 只有在掃描中才停止
      if (html5QrCode.isScanning) {
        await html5QrCode.stop()
      }
      // 清除內容
      html5QrCode.clear()
    } catch (err) {
      console.error('Failed to stop scanner', err)
    } finally {
      isCameraActive.value = false
    }
  }
}

const loadScanAudio = async() => {
  try {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  
    const [resSuccess, resFailure] = await Promise.all([
      fetch('/audio/scan-success.mp3'),
      fetch('/audio/scan-failure.mp3')
    ])

    const [arraySuccess, arrayFailure] = await Promise.all([
      resSuccess.arrayBuffer(),
      resFailure.arrayBuffer()
    ])
  
    successBuffer = await audioCtx.decodeAudioData(arraySuccess)
    failureBuffer = await audioCtx.decodeAudioData(arrayFailure)
  } catch(error) {
    console.error('音效預載失敗', 0)
  }
}

const playScanAudio = (result: string) => {
  if (!audioCtx! || !successBuffer || !failureBuffer) return

  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }

  const source = audioCtx.createBufferSource()
  source.buffer = result === 'success' ? successBuffer : failureBuffer

  const gainNode = audioCtx.createGain()
  gainNode.gain.value = 0.3

  source.connect(gainNode)
  gainNode.connect(audioCtx.destination)

  source.start()
}

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
        <div class="flex items-center gap-3 mb-4 text-slate-400">
          <AppIcon name="event_note" />
          <h3 class="text-sm font-bold uppercase tracking-widest">第一步：選擇活動</h3>
        </div>

        <div v-if="isLoading" class="py-4 flex justify-center">
          <van-loading type="spinner" color="#0ea5e9" />
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
  @apply w-full object-cover rounded-2xl;
}
</style>
