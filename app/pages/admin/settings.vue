
<script setup lang="ts">
import type { SettingItem } from '@/types';

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
  showTabbar: true,
  tabbarKey: 'settings'
})

// 使用 useUser composable
const {
  userProfile,
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

// 載入用戶資料
onMounted(() => {
  loadUserData()
})

// 統計數據
const settingItems = computed<SettingItem[]>(() => {
  return [
    { icon: 'qr_code_scanner', label: '活動簽到', path: '/admin/checkin' },
    { icon: 'admin_panel_settings', label: '權限管理', path: '/admin/scanner-permissions' },
    { icon: 'database', label: '點數紀錄', path: '/admin/points-history' },
    { icon: 'lock_reset', label: '修改密碼', path: '/home/change-password' }
  ]
})

const getRoleName = (role?: string) => {
  if (role === 'guest') return '訪客'
  return '管理員'
}
</script>

<template>
  <div class="events-page">
    <AppHeaderHero title="管理設定" height-class="h-40">
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
      </div>

      <!-- Action Items List -->
      <div class="space-y-3 mb-8">
        <h3 class="px-2 text-sm font-bold text-slate-500 uppercase tracking-widest">{{ '帳號管理' }}</h3>
        <div class="bg-white/80 rounded-2xl overflow-hidden shadow-sm">
          <NuxtLink
            v-for="(item, index) in settingItems"
            :key="item.label"
            :to="item.path || '#'"
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
      :is-admin="true"
      @navigate-to-editor="navigateToEditor"
    />
  </div>
</template>
