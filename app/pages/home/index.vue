
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
  handleLogout
} = useUser()

const {
  fileInput,
  handleAvatarClick,
  handleFileSelect,
  getAvatarUrl
} = useProfileAvatarUpload()

const { openMenu } = useSideMenu()

const qrPopupVisible = ref(false)

const canUseScanner = computed(() => {
  return userProfile.value?.role === 'admin' || userProfile.value?.scanPermission === true
})

// 統計數據
const menuItems = computed(() => {
  const items = [
    { icon: 'qr_code_2', label: '我的QR Code', path: '', action: 'qr-code' },
    { icon: 'history', label: '點數紀錄', path: '/points-history' }
  ]

  if (canUseScanner.value) {
    items.unshift({ icon: 'qr_code_scanner', label: '簽到掃描', path: '/admin/checkin' })
  }

  return items
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
          <AppIcon name="menu" class="text-2xl" />
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
              <AppIcon name="photo_camera" class="text-white opacity-0 hover:opacity-100 transition-opacity" />
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

        <div class="mb-6">
          <h2 class="text-3xl font-black text-slate-900 tracking-tight">
            {{ userProfile?.name ?? '載入中...' }}
          </h2>
          <div class="flex items-center justify-center gap-2 mt-2">
            <span class="text-[11px] font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-widest">
              {{ getRoleName(userProfile?.role) }}
            </span>
          </div>
        </div>

        <!-- Points Wallet Card -->
        <div class="w-full bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-100">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <AppIcon name="database" :fill="true" />
            </div>
            <div class="text-left">
              <p class="font-black text-slate-800 leading-none mt-0.5">累積點數</p>
            </div>
          </div>
          <div class="text-right">
            <p v-if="isUserLoading" class="size-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></p>
            <p v-else class="text-xl font-black text-amber-600 tracking-tighter">{{ userProfile?.points ?? 0 }}</p>
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
            :to="item.path"
            @click="handleItemClick(item, $event)"
            class="flex items-center justify-between p-4 hover:bg-primary/5 transition-colors border-b border-slate-50"
          >
            <div class="flex items-center gap-3">
              <AppIcon :name="item.icon" class="text-slate-400" />
              <span class="font-medium">{{ item.label }}</span>
            </div>
            <AppIcon name="chevron_right" class="text-slate-300" />
          </NuxtLink>
          
          <button
            @click="handleLogout"
            class="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors border-b border-slate-50"
          >
            <div class="flex items-center gap-3 text-red-500">
              <AppIcon name="logout" />
              <span class="font-bold">登出帳號</span>
            </div>
          </button>
        </div>
      </div>
    </main>

    <QRCode v-model:show="qrPopupVisible" />
  </div>
</template>

