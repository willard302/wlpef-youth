import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import type { Event, CheckinScanResult } from '~/types'
import { eventService } from '~/services/event'
import { eventAdminService } from '~/services/eventAdmin'

export const useCheckin = () => {
  let html5QrCode: Html5Qrcode | null = null
  let audioCtx: AudioContext | null = null
  let successBuffer: AudioBuffer | null = null
  let failureBuffer: AudioBuffer | null = null

  const { addToast } = useToast()

  const events = ref<Event[]>([])
  const selectedEventId = ref('')
  const isLoading = ref(true)
  const isScanning = ref(false)
  const isCameraActive = ref(false)
  const lastScannedId = ref('')
  const scanResult = ref<CheckinScanResult | null>(null)
  const scannedMemberId = ref('')

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
  const loadScanAudio = async () => {
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
    } catch (error) {
      console.error('音效預載失敗', error)
    }
  }

  const playScanAudio = (result: 'success' | 'failure') => {
    if (!audioCtx || !successBuffer || !failureBuffer) return

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

  return {
    events,
    selectedEventId,
    isLoading,
    isScanning,
    isCameraActive,
    lastScannedId,
    scanResult,
    scannedMemberId,
    startScanner,
    stopScanner,
    loadScanAudio,
    loadEvents,
    onScanSuccess
  }
}
