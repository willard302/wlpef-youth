<script setup lang="ts">
import type { FormFieldDefinition } from '@/types'

const router = useRouter()

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
  showTabbar: false,
})

// 使用 useUser 獲取用戶信息（用於大頭照）
const { userProfile, uploadAvatar, isUploadingAvatar, loadUserData } = useUser()

// 使用 useUserInfo 管理表單狀態
const { formData, isLoading, isSaving, error, success, updateUserInfo } = useUserInfo()

// 使用 Toast
const { success: showSuccessToast, error: showErrorToast } = useToast()

// 表單欄位定義 (使用從 types 導入的統一型別)
const formFields: FormFieldDefinition[] = [
  { key: 'name', label: '姓名', icon: 'person', placeholder: '請輸入姓名', type: 'text' },
  { key: 'department', label: '校友會 / 單位', icon: 'corporate_fare', placeholder: '例：台北校友會', type: 'text' },
  { key: 'phoneNumber', label: '電話號碼', icon: 'call', placeholder: '請輸入電話號碼', type: 'tel' },
  { 
    key: 'gender', 
    label: '性別', 
    icon: 'wc', 
    placeholder: '請選擇性別', 
    type: 'select', 
    options: [
      { label: '男', value: 'male' },
      { label: '女', value: 'female' },
      { label: '其他', value: 'other' }
    ] 
  },
  { 
    key: 'bio', 
    label: '個人簡介', 
    icon: 'description', 
    placeholder: '分享你的背景或習禪心得...', 
    type: 'textarea',
    rows: 4
  },
]

// 處理大頭照點擊
const avatarInput = ref<HTMLInputElement | null>(null)
const handleAvatarClick = () => {
  avatarInput.value?.click()
}

// 處理大頭照上傳
const handleAvatarUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  try {
    await uploadAvatar(file)
    // 重新載入用戶資料確保最新
    await loadUserData()
    showSuccessToast('大頭照上傳成功')
    if (avatarInput.value) {
      avatarInput.value.value = ''
    }
  } catch (err: any) {
    showErrorToast(err.message || '上傳大頭照失敗')
    if (avatarInput.value) {
      avatarInput.value.value = ''
    }
  }
}

// 處理保存
const handleSave = async () => {
  try {
    await updateUserInfo()
    // 重新載入用戶資料確保同步
    await loadUserData()
    showSuccessToast('個人資料已更新')
  } catch (err: any) {
    showErrorToast(err.message || '保存修改失敗')
  }
}

// 獲取大頭照 URL
const getAvatarUrl = () => {
  return userProfile.value?.avatar || '/images/avatar_default.png'
}

// 初始化時載入用戶資料
onMounted(() => {
  loadUserData()
})

// 在離開頁面前同步數據
onBeforeUnmount(async () => {
  // 確保返回時數據是最新的
  await loadUserData()
})
</script>

<template>
  <div class="relative flex min-h-screen w-full flex-col bg-[#f0f9ff] overflow-x-hidden pb-16">
    <!-- Header -->
    <AppHeaderPage title="編輯個人資料" @back="router.back" />

    <main class="flex-1 w-full px-4 py-6 space-y-8">
      <!-- Profile Picture Section -->
      <div class="flex flex-col items-center gap-4">
        <div class="relative group">
          <div class="size-32 rounded-full bg-white p-1 shadow-xl border border-sky-500/20 overflow-hidden cursor-pointer transition-transform hover:scale-105"
            @click="handleAvatarClick">
            <img 
              :src="getAvatarUrl()" 
              alt="User avatar" 
              class="w-full h-full object-cover rounded-full"
            />
            <!-- Loading overlay -->
            <div
              v-if="isUploadingAvatar"
              class="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center"
            >
              <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
          <button 
            class="absolute bottom-0 right-0 size-10 bg-sky-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-sky-500/90 transition-transform active:scale-95"
            @click="handleAvatarClick"
            :disabled="isUploadingAvatar"
          >
            <span class="material-symbols-outlined text-sm">edit</span>
          </button>
        </div>
        <input
          ref="avatarInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleAvatarUpload"
        />
        <div class="text-center">
          <p class="text-sky-500 font-semibold">領袖會社青團</p>
        </div>
      </div>

      <!-- Form Section -->
      <div class="bg-white/60 backdrop-blur-sm p-6 rounded-3xl shadow-sm space-y-5 border border-white">
        <!-- Error Message -->
        <div v-if="error" class="p-3 bg-red-100 text-red-700 rounded-xl text-sm border border-red-200 flex items-center gap-2">
          <span class="material-symbols-outlined text-base">error</span>
          {{ error }}
        </div>

        <!-- Success Message -->
        <div v-if="success" class="p-3 bg-green-100 text-green-700 rounded-xl text-sm border border-green-200 flex items-center gap-2">
          <span class="material-symbols-outlined text-base">check_circle</span>
          個人資料已更新
        </div>

        <!-- 使用 v-for 渲染所有欄位 (包括 Select 與 Textarea) -->
        <FormField
          v-for="field in formFields"
          :key="field.key"
          v-model="formData[field.key]"
          :label="field.label"
          :icon="field.icon"
          :placeholder="field.placeholder"
          :type="field.type"
          :options="field.options"
          :rows="field.rows"
          :disabled="isLoading"
        />
      </div>

      <!-- Save Button -->
      <div class="pt-4 space-y-3">
        <button 
          @click="handleSave"
          :disabled="isSaving || isLoading"
          class="w-full h-14 bg-sky-500 text-white font-bold rounded-2xl shadow-lg shadow-sky-500/20 hover:bg-sky-500/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="!isSaving" class="material-symbols-outlined">save</span>
          <span v-else class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          {{ isSaving ? '修改中...' : '保存'  }}
        </button>

        <!-- Change Password Button -->
        <button 
          @click="router.push('/user-center/change-password')"
          class="w-full h-14 bg-white/60 text-sky-600 font-bold rounded-2xl border-2 border-sky-500/30 hover:bg-white/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span class="material-symbols-outlined">lock</span>
          修改密碼
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.font-variation-settings-fill-0 {
  font-variation-settings: "FILL" 0;
}
</style>
