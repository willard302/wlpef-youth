
<script setup lang="ts">
import type { MenuItem } from '@/types';

definePageMeta({
  layout: 'default'
})

// 使用 useUser composable
const {
  userProfile,
  isUploadingAvatar,
  loadUserData,
  uploadAvatar,
  handleLogout,
} = useUser()

// 使用 Toast
const { error: showErrorToast } = useToast()

// 載入用戶資料
onMounted(() => {
  loadUserData()
})

// 檔案輸入引用
const fileInput = ref<HTMLInputElement | null>(null)

// 處理大頭照點擊
const handleAvatarClick = () => {
  fileInput.value?.click()
}

// 處理檔案選擇
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  try {
    await uploadAvatar(file)
    // 成功上傳後清除檔案輸入
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  } catch (err: any) {
    // 顯示錯誤Toast
    showErrorToast(err.message || '上傳大頭照失敗')
    // 清除檔案輸入
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

// 獲取大頭照URL，如果沒有則使用預設圖片
const getAvatarUrl = () => {
  return userProfile.value?.avatar || '/images/avatar_default.png'
}

const isAdmin = computed(() => userProfile.value?.role === 'admin')

// 統計數據
const menuItems = computed<MenuItem[]>(() => {
  if (isAdmin.value) {
    return [
      { icon: 'database', label: '點數交易紀錄', path: '/points-history/admin' },
      { icon: 'lock_reset', label: '修改密碼', path: '/user-center/change-password' }
    ]
  }
  return [
    { icon: 'qr_code_2', label: '我的報到碼', path: '/user-center/qr-code' },
    { icon: 'history', label: '點數交易紀錄', path: '/points-history' },
    { icon: 'person_edit', label: '編輯個人資料', path: '/user-center/user-info' },
    { icon: 'lock_reset', label: '修改密碼', path: '/user-center/change-password' }
  ]
})

const getRoleName = (role?: string) => {
  if (role === 'admin') return '管理員'
  if (role === 'guest') return '訪客'
  return '會員'
}
</script>

<template>
  <div class="user-center-page">
    <AppHeroHeader :title="isAdmin ? '管理設定' : '會員中心'" height-class="h-40" />

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

        <div v-if="!isAdmin" class="w-full grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
          <div class="text-left">
            <p class="text-xs text-slate-500 uppercase tracking-wider">校友會</p>
            <p class="font-semibold text-slate-800">{{ userProfile?.department ?? '載入中...' }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-slate-500 uppercase tracking-wider">點數</p>
            <p class="font-semibold text-slate-800">{{ userProfile?.points ?? '載入中...' }}</p>
          </div>
        </div>
      </div>

      <!-- Action Items List -->
      <div class="space-y-3 mb-8">
        <h3 class="px-2 text-sm font-bold text-slate-500 uppercase tracking-widest">{{ isAdmin ? '帳號管理' : '帳戶設定' }}</h3>
        <div class="bg-white/80 rounded-2xl overflow-hidden shadow-sm">
          <NuxtLink
            v-for="(item, index) in menuItems"
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
  </div>
</template>
