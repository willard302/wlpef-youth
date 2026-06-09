
<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
  showTabbar: true,
  tabbarKey: 'home'
})

// 使用 useUser composable
const {
  userProfile,
  isLoading: isUserLoading,
  isUploadingAvatar,
  loadUserData,
  handleLogout,
} = useUser()

const {
  fileInput,
  handleAvatarClick,
  handleFileSelect,
  getAvatarUrl
} = useProfileAvatarUpload()

const {
  menuVisible,
  openMenu,
  navigateToEditor,
} = useSideMenu()

const qrPopupVisible = ref(false)

// 載入用戶資料
onMounted(() => {
  loadUserData(true)
})

// 統計數據
const menuItems = computed(() => {
  return [
    { icon: 'qr_code_2', label: '我的QR Code', path: '', action: 'qr-code' },
    { icon: 'history', label: '點數紀錄', path: '/points-history' },
    { icon: 'lock_reset', label: '修改密碼', path: '/home/change-password' }
  ]
})

const handleItemClick = (item: any, event: Event) => {
  if (item.action === 'qr-code') {
    event.preventDefault()
    qrPopupVisible.value = true
  }
}

const getRoleName = (role?: string) => {
  if (role === 'guest') return '訪客'
  return '會員'
}
</script>

<template>
  <div class="user-center-page">
    <AppHeaderHero 
      :title="`哈囉，${userProfile?.name ?? '使用者'}`"
      height-class="h-40"
    >
      <template #actions>
        <button
          @click="openMenu"
          class="size-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-all"
        >
          <span class="material-symbols-outlined text-2xl">menu</span>
        </button>
      </template>
    </AppHeaderHero>

    <!-- Main Content -->
    <main class="flex-1 -mt-8 px-4 pb-24 relative z-20">
      <!-- Profile Info Card -->
      <div class="bg-white rounded-3xl shadow-xl p-6 flex flex-col items-center text-center mb-6">
        <div class="relative -mt-16 mb-4 p-2 bg-white rounded-full shadow-lg">
          <div
            class="w-28 h-28 rounded-full border-4 border-dashed border-primary/30 p-1 overflow-hidden cursor-pointer transition-transform hover:scale-105 relative"
            @click="handleAvatarClick"
          >
            <!-- Loading overlay -->
            <div
              v-if="isUploadingAvatar"
              class="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center z-10"
            >
              <div class="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>

            <div
              class="w-full h-full rounded-full bg-cover bg-center"
              :style="{ backgroundImage: `url('${getAvatarUrl()}')` }"
            ></div>

            <!-- Upload hint -->
            <div class="absolute inset-0 bg-black/0 hover:bg-black/20 rounded-full flex items-center justify-center transition-colors">
              <span class="material-symbols-outlined text-white opacity-0 hover:opacity-100 transition-opacity">photo_camera</span>
            </div>
          </div>
        </div>

        <!-- Hidden file input -->
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleFileSelect"
        />

        <div class="mb-4">
          <h2 class="text-2xl font-bold text-slate-900">
            {{ userProfile?.name ?? '載入中...' }}
          </h2>
          <div class="flex items-center justify-center gap-2 mt-2 flex-wrap">
            <span class="text-sm font-semibold px-3 py-1 rounded-full border bg-primary/10 text-primary border-primary/20">
              {{ getRoleName(userProfile?.role) }}
            </span>
          </div>
        </div>

        <div class="w-full grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
          <div class="text-left">
            <p class="text-xs text-slate-500 uppercase tracking-wider">校友會</p>
            <p class="font-semibold text-slate-800">{{ userProfile?.department ?? '載入中...' }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-slate-500 uppercase tracking-wider">點數</p>
            <p class="font-semibold text-slate-800 flex items-center justify-end min-h-[24px]">
              <span
                v-if="isUserLoading"
                class="inline-block w-4 h-4 border-2 border-slate-300 border-t-sky-500 rounded-full animate-spin"
                aria-label="點數載入中"
              ></span>
              <span v-else>{{ userProfile?.points ?? 0 }}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Action Items List -->
      <div class="space-y-3 mb-8">
        <h3 class="px-2 text-sm font-bold text-slate-500 uppercase tracking-widest">{{ '帳戶設定' }}</h3>
        <div class="bg-white/80 rounded-2xl overflow-hidden shadow-sm">
          <NuxtLink
            v-for="(item, index) in menuItems"
            :key="item.label"
            :to="item.path || '#'"
            @click="handleItemClick(item, $event)"
            class="flex items-center justify-between p-4 hover:bg-primary/5 transition-colors border-b border-slate-50"
          >
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-slate-400">{{ item.icon }}</span>
              <span class="font-medium">{{ item.label }}</span>
            </div>
            <span class="material-symbols-outlined text-slate-300">chevron_right</span>
          </NuxtLink>
          <!-- 登出按鈕：呼叫 handleLogout 正確清除 session -->
          <button
            @click="handleLogout"
            class="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors"
          >
            <div class="flex items-center gap-3 text-red-500">
              <span class="material-symbols-outlined">logout</span>
              <span class="font-bold">登出</span>
            </div>
          </button>
        </div>
      </div>
    </main>

    <SideMenu
      v-model:show="menuVisible"
      :is-admin="userProfile?.role === 'admin'"
      @navigate-to-editor="navigateToEditor"
    />

    <QRCode v-model:show="qrPopupVisible" />
  </div>
</template>
