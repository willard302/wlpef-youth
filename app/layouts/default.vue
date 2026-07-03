<script setup lang="ts">
const route = useRoute()
const { toasts, removeToast } = useToast()
const { menuVisible } = useSideMenu()

const qrPopupVisible = ref(false)
const { tabbarItems, activeIndex } = useTabbarConfig()

const showTabbar = computed(() => route.meta.showTabbar !== false)

// 全域中獎通知（含雙層 gating：活動時間窗 + raffle_active）
// notifyStyle='modal' 時的自訂彈窗需靠此處掛載的 RaffleWinModal 才能全站顯示
const { showWinModal, myWinningPrizes, closeWinModal } = useRaffleNotifier()


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

    <SideMenu
      v-model:show="menuVisible"
      :is-admin="false"
    />

    <!-- Tabbar -->
    <Tabbar 
      v-if="showTabbar" 
      :items="tabbarItems" 
      :active-index="activeIndex" 
      @qr-click="qrPopupVisible = true"
    />

    <!-- QR Code Popup -->
    <QRCode v-model:show="qrPopupVisible" />

    <!-- 全域中獎彈窗（notifyStyle='modal' 時生效；'dialog' 時恆為關閉不顯示） -->
    <RaffleWinModal :open="showWinModal" :wins="myWinningPrizes" @close="closeWinModal" />
  </div>
</template>

<style scoped></style>
