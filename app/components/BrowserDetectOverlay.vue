<script setup lang="ts">
const isLine = ref(false)
const isFB = ref(false)
const isIOS = ref(false)
const isAndroid = ref(false)
const showOverlay = ref(false)

onMounted(() => {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera
  isLine.value = /Line/i.test(ua)
  isFB.value = /FBAN|FBAV/i.test(ua)
  isIOS.value = /iPhone|iPad|iPod/i.test(ua)
  isAndroid.value = /Android/i.test(ua)

  // 如果是在 LINE 或 FB 內開啟
  if (isLine.value || isFB.value) {
    if (isAndroid.value) {
      // Android: 嘗試自動跳轉
      const currentUrl = window.location.href
      // 使用 intent scheme 強制用外部瀏覽器開啟 (通常是 Chrome)
      window.location.href = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`
    } else if (isIOS.value) {
      // iOS: 無法自動跳轉，顯示引導遮罩
      showOverlay.value = true
    }
  }
})
</script>

<template>
  <div 
    v-if="showOverlay" 
    class="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-start pt-20 px-8 text-white"
  >
    <div class="absolute top-6 right-6 animate-bounce">
      <div class="flex flex-col items-center">
        <span class="material-symbols-outlined text-4xl text-sky-400">arrow_upward</span>
        <p class="text-[10px] font-bold mt-1 uppercase tracking-widest text-sky-400">點擊上方選單</p>
      </div>
    </div>

    <div class="w-full max-w-xs space-y-8 text-center">
      <div class="relative inline-block">
        <div class="size-24 rounded-[2.5rem] bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow-2xl shadow-sky-500/20">
          <span class="material-symbols-outlined text-5xl">language</span>
        </div>
        <div class="absolute -bottom-2 -right-2 size-10 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-slate-900">
          <span class="material-symbols-outlined text-xl">check</span>
        </div>
      </div>

      <div class="space-y-3">
        <h2 class="text-2xl font-black tracking-tight">建議使用外部瀏覽器</h2>
        <p class="text-slate-400 text-sm leading-relaxed font-medium">
          為了確保您的報到紀錄與功能正常運作，請切換至系統瀏覽器。
        </p>
      </div>

      <div class="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4 text-left">
        <p class="text-xs font-bold text-sky-400 uppercase tracking-widest flex items-center gap-2">
          <span class="size-1.5 rounded-full bg-sky-400"></span>
          如何切換？
        </p>
        
        <div class="space-y-4">
          <div class="flex items-start gap-4">
            <div class="size-8 rounded-xl bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">1</div>
            <p class="text-sm text-slate-200">點擊右上角的 <span class="bg-white/20 px-1.5 py-0.5 rounded text-white font-bold">...</span> 圖示</p>
          </div>
          <div class="flex items-start gap-4">
            <div class="size-8 rounded-xl bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">2</div>
            <p class="text-sm text-slate-200">選擇 <span class="text-sky-400 font-bold">「以 Safari 開啟」</span> 或 <span class="text-sky-400 font-bold">「在瀏覽器開啟」</span></p>
          </div>
        </div>
      </div>

      <p class="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] pt-4">
        領袖會社青團
      </p>
    </div>
  </div>
</template>

<style scoped>
.material-symbols-outlined {
  font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>
