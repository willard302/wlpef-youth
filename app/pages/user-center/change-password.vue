<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUser } from '@/composables/useUser'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const { changePassword, isChangingPassword, error: userError } = useUser()
const { success: showSuccessToast, error: showErrorToast } = useToast()

definePageMeta({
  layout: 'default',
  hideTabbar: true
})

// 表單狀態
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const localError = ref<string | null>(null)

// 表單驗證
const isCurrentPasswordValid = computed(() => {
  return currentPassword.value.length > 0
})

const isNewPasswordValid = computed(() => {
  return newPassword.value.length >= 6
})

const isConfirmPasswordValid = computed(() => {
  return confirmPassword.value.length >= 6 && confirmPassword.value === newPassword.value
})

const isFormValid = computed(() => {
  return isCurrentPasswordValid.value && isNewPasswordValid.value && isConfirmPasswordValid.value
})

const passwordsMatch = computed(() => {
  if (confirmPassword.value.length === 0) return true // 未填時不顯示錯誤
  return newPassword.value === confirmPassword.value
})

// 密碼強度指示
const passwordStrength = computed<{ level: number; text: string; color: string }>(() => {
  const pwd = newPassword.value
  if (!pwd) return { level: 0, text: '', color: '' }
  
  let strength = 0
  if (pwd.length >= 6) strength++
  if (pwd.length >= 10) strength++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++
  if (/\d/.test(pwd)) strength++
  if (/[!@#$%^&*]/.test(pwd)) strength++
  
  const levels = [
    { level: 0, text: '', color: '' },
    { level: 1, text: '弱', color: 'text-red-400' },
    { level: 2, text: '中', color: 'text-yellow-400' },
    { level: 3, text: '強', color: 'text-green-400' },
    { level: 4, text: '非常強', color: 'text-green-500' },
    { level: 5, text: '極強', color: 'text-green-600' }
  ]
  
  return levels[Math.min(strength, 5)]!
})

// 清除所有錯誤
const clearErrors = () => {
  localError.value = null
}

// 提交表單
const handleSubmit = async () => {
  localError.value = null
  
  // 客戶端驗證
  if (!isFormValid.value) {
    localError.value = '請填寫所有必填欄位'
    return
  }

  if (!passwordsMatch.value) {
    localError.value = '新密碼和確認密碼不相符'
    return
  }

  if (newPassword.value.length < 6) {
    localError.value = '新密碼至少需要6個字符'
    return
  }

  try {
    await changePassword(currentPassword.value, newPassword.value, confirmPassword.value)
    
    // 清除表單
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    
    showSuccessToast('密碼已成功修改')
    
    // 2秒後返回上一頁
    setTimeout(() => {
      router.back()
    }, 1500)
  } catch (err: any) {
    localError.value = err.message || '請填寫所有必填欄位' // fallback
    showErrorToast(localError.value as string)
  }
}

// 監聽輸入框變化時清除錯誤
const handleInput = () => {
  if (localError.value) {
    localError.value = null
  }
}
</script>

<template>
  <div class="relative flex min-h-screen w-full flex-col bg-[#f0f9ff] overflow-x-hidden pb-16">
    <!-- Header -->
    <AppPageHeader title="修改密碼" @back="router.back" />

    <!-- Main Content -->
    <main class="flex-1 w-full px-4 py-6 space-y-6">
      <!-- Error Message -->
      <div 
        v-if="localError"
        class="p-3 bg-red-100 text-red-700 rounded-xl text-sm border border-red-200 flex items-center gap-2"
      >
        <span class="material-symbols-outlined text-base">error</span>
        {{ localError }}
      </div>

      <!-- Form Section -->
      <div class="bg-white/60 backdrop-blur-sm p-6 rounded-3xl shadow-sm space-y-5 border border-white">
        <!-- Current Password Field -->
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-slate-700 ml-1">
            當前密碼
          </label>
          <div class="relative flex items-center">
            <span class="material-symbols-outlined absolute left-4 text-slate-400">lock</span>
            <input 
              v-model="currentPassword"
              @input="handleInput"
              :type="showCurrentPassword ? 'text' : 'password'"
              class="w-full h-12 pl-12 pr-12 rounded-2xl border-none bg-white/80 focus:ring-2 focus:ring-sky-500/50 shadow-sm placeholder:text-slate-400 text-slate-800"
              placeholder="輸入當前密碼"
            />
            <button
              type="button"
              @click="showCurrentPassword = !showCurrentPassword"
              class="absolute right-4 p-2 hover:bg-sky-500/10 rounded-lg transition-colors"
            >
              <span class="material-symbols-outlined text-slate-400 text-xl font-variation-settings-fill-0">
                {{ showCurrentPassword ? 'visibility' : 'visibility_off' }}
              </span>
            </button>
          </div>
        </div>

        <!-- New Password Field -->
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-slate-700 ml-1">
            新密碼
          </label>
          <div class="relative flex items-center">
            <span class="material-symbols-outlined absolute left-4 text-slate-400">lock</span>
            <input 
              v-model="newPassword"
              @input="handleInput"
              :type="showNewPassword ? 'text' : 'password'"
              class="w-full h-12 pl-12 pr-12 rounded-2xl border-none bg-white/80 focus:ring-2 focus:ring-sky-500/50 shadow-sm placeholder:text-slate-400 text-slate-800"
              placeholder="輸入新密碼"
            />
            <button
              type="button"
              @click="showNewPassword = !showNewPassword"
              class="absolute right-4 p-2 hover:bg-sky-500/10 rounded-lg transition-colors"
            >
              <span class="material-symbols-outlined text-slate-400 text-xl font-variation-settings-fill-0">
                {{ showNewPassword ? 'visibility' : 'visibility_off' }}
              </span>
            </button>
          </div>
          
          <!-- Password Strength Indicator -->
          <div v-if="newPassword" class="ml-1 flex items-center gap-2">
            <div class="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div 
                class="h-full transition-all duration-300 rounded-full"
                :class="{
                  'w-1/5 bg-red-400': passwordStrength.level === 1,
                  'w-2/5 bg-yellow-400': passwordStrength.level === 2,
                  'w-3/5 bg-green-400': passwordStrength.level === 3,
                  'w-4/5 bg-green-500': passwordStrength.level === 4,
                  'w-full bg-green-600': passwordStrength.level === 5
                }"
              ></div>
            </div>
            <span class="text-[12px] font-bold min-w-12" :class="passwordStrength.color">
              {{ passwordStrength.text }}
            </span>
          </div>
        </div>

        <!-- Confirm Password Field -->
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-slate-700 ml-1">
            確認新密碼
          </label>
          <div class="relative flex items-center">
            <span class="material-symbols-outlined absolute left-4 text-slate-400">lock_reset</span>
            <input 
              v-model="confirmPassword"
              @input="handleInput"
              :type="showConfirmPassword ? 'text' : 'password'"
              class="w-full h-12 pl-12 pr-12 rounded-2xl border-none bg-white/80 focus:ring-2 focus:ring-sky-500/50 shadow-sm placeholder:text-slate-400 text-slate-800"
              :class="{ 'ring-2 ring-red-400/50': !passwordsMatch && confirmPassword.length > 0 }"
              placeholder="確認新密碼"
            />
            <button
              type="button"
              @click="showConfirmPassword = !showConfirmPassword"
              class="absolute right-4 p-2 hover:bg-sky-500/10 rounded-lg transition-colors"
            >
              <span class="material-symbols-outlined text-slate-400 text-xl font-variation-settings-fill-0">
                {{ showConfirmPassword ? 'visibility' : 'visibility_off' }}
              </span>
            </button>
          </div>
          
          <!-- Password Match Indicator -->
          <div v-if="confirmPassword" class="ml-1 flex items-center gap-2">
            <span 
              class="material-symbols-outlined text-sm"
              :class="passwordsMatch ? 'text-green-500' : 'text-red-500'"
            >
              {{ passwordsMatch ? 'check_circle' : 'cancel' }}
            </span>
            <span 
              class="text-[12px] font-bold"
              :class="passwordsMatch ? 'text-green-600' : 'text-red-600'"
            >
              {{ passwordsMatch ? '密碼相符' : '密碼不相符' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Submit Button -->
      <div class="pt-4">
        <button
          @click="handleSubmit"
          :disabled="!isFormValid || isChangingPassword || !passwordsMatch"
          class="w-full h-14 bg-sky-500 text-white font-bold rounded-2xl shadow-lg shadow-sky-500/20 hover:bg-sky-500/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span 
            v-if="isChangingPassword"
            class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
          ></span>
          <span v-else class="material-symbols-outlined">save</span>
          {{ isChangingPassword ? '修改中...' : '確認' }}
        </button>
      </div>

      <!-- Password Requirements -->
      <div class="bg-white/40 p-5 rounded-2xl border border-white">
        <p class="text-[12px] text-slate-500 font-bold uppercase tracking-wider mb-3">密碼要求</p>
        <ul class="space-y-2">
          <li class="flex items-center gap-3">
            <span 
              class="material-symbols-outlined text-base"
              :class="newPassword.length >= 6 ? 'text-green-500' : 'text-slate-300'"
            >
              {{ newPassword.length >= 6 ? 'check_circle' : 'circle' }}
            </span>
            <span class="text-sm font-medium" :class="newPassword.length >= 6 ? 'text-slate-800' : 'text-slate-500'">至少6個字符</span>
          </li>
          <li class="flex items-center gap-3">
            <span 
              class="material-symbols-outlined text-base"
              :class="/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? 'text-green-500' : 'text-slate-300'"
            >
              {{ /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? 'check_circle' : 'circle' }}
            </span>
            <span class="text-sm font-medium" :class="/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? 'text-slate-800' : 'text-slate-500'">包含大小寫字母</span>
          </li>
          <li class="flex items-center gap-3">
            <span 
              class="material-symbols-outlined text-base"
              :class="/\d/.test(newPassword) ? 'text-green-500' : 'text-slate-300'"
            >
              {{ /\d/.test(newPassword) ? 'check_circle' : 'circle' }}
            </span>
            <span class="text-sm font-medium" :class="/\d/.test(newPassword) ? 'text-slate-800' : 'text-slate-500'">包含數字</span>
          </li>
        </ul>
      </div>

      <!-- Footer Text -->
      <p class="text-center text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] pt-8">
        領袖會社青團
      </p>
    </main>
  </div>
</template>

<style scoped>
.font-variation-settings-fill-0 {
  font-variation-settings: "FILL" 0;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
