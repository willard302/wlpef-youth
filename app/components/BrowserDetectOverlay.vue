<script setup lang="ts">
const showOverlay = ref(false)

if (import.meta.client) {
  ;(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || ''
    const currentUrl = window.location.href

    const isLine = /Line/i.test(ua)
    const isFB = /FBAN|FBAV/i.test(ua)
    const isIOS = /iPhone|iPad|iPod/i.test(ua)
    const isAndroid = /Android/i.test(ua)

    // 處理 LINE 的自動跳轉 (iOS & Android 通用最簡單方式)
    if (isLine) {
      const url = new URL(currentUrl)
      const hasRequestedExternal = url.searchParams.get('openExternalBrowser') === '1'

      if (!hasRequestedExternal) {
        url.searchParams.set('openExternalBrowser', '1')
        window.location.replace(url.toString())
        // 立刻返回，避免頁面先顯示內容再跳轉
        return
      }

      // 若已帶參數仍在 LINE 內，代表自動外開失敗，改為顯示操作提示
      showOverlay.value = true
      return
    }

    // 處理 Android 的強制跳轉 (針對 FB 或其他內建瀏覽器)
    if (isAndroid && isFB) {
      const schemaUrl = currentUrl.replace(/^https?:\/\//, '')
      window.location.replace(`intent://${schemaUrl}#Intent;scheme=https;package=com.android.chrome;end`)
      return
    }

    // 處理 iOS 內嵌瀏覽器 (無法自動跳轉，故顯示遮罩提示)
    if (isIOS && isFB) {
      showOverlay.value = true
    }
  })()
}
</script>

<template>
  <Transition name="fade">
    <div 
      v-if="showOverlay" 
      class="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-start pt-20 px-8 text-white select-none"
    >
      <div class="absolute top-6 right-6 animate-bounce">
        <div class="flex flex-col items-center">
          <AppIcon name="arrow_upward" size="xl" class="text-sky-400" />
          <p class="text-[10px] font-bold mt-1 uppercase tracking-widest text-sky-400">點擊上方選單</p>
        </div>
      </div>

      <div class="w-full max-w-xs space-y-8 text-center">
        <div class="relative inline-block">
          <div class="size-24 rounded-[2.5rem] bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow-2xl shadow-sky-500/20">
            <AppIcon name="language" :size="48" fill class="text-white" />
          </div>
          <div class="absolute -bottom-2 -right-2 size-10 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-slate-900">
            <AppIcon name="check" size="sm" fill class="text-white" />
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
  </Transition>
</template>

<style scoped>
/* 淡入淡出動畫 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
