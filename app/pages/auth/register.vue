<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { RegisterFormData } from '@/types'

definePageMeta({
  layout: 'auth'
})

const formData = ref<RegisterFormData>({
  fullName: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const showPassword = ref(false)
const supabase = useSupabaseClient()
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const showDuplicateEmailModal = ref(false)

const handleRegister = async () => {
  if (!formData.value.fullName.trim() || !formData.value.email.trim() || !formData.value.password) {
    errorMessage.value = '請填寫所有必填欄位。'
    return
  }

  if (formData.value.password !== formData.value.confirmPassword) {
    errorMessage.value = '密碼不相符。'
    return
  }

  try {
    loading.value = true
    errorMessage.value = ''
    successMessage.value = ''
    
    // 透過 Supabase Auth 註冊使用者
    const { error } = await supabase.auth.signUp({
      email: formData.value.email,
      password: formData.value.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: {
          name: formData.value.fullName,
          display_name: formData.value.fullName
        }
      }
    })
    
    if (error) throw error
    
    successMessage.value = '註冊成功！請確認您的電子郵件以啟用帳號。'

    // 導向登入頁
    setTimeout(() => {
      navigateTo('/auth/login')
    }, 2000)
    
  } catch (error: any) {
    const message = error?.message || ''

    if (message.toLowerCase().includes('already registered')) {
      errorMessage.value = ''
      showDuplicateEmailModal.value = true
      return
    }

    errorMessage.value = message || '註冊時發生錯誤。'
  } finally {
    loading.value = false
  }
}

const handleContinueRegister = () => {
  showDuplicateEmailModal.value = false
}

const handleGoLogin = () => {
  showDuplicateEmailModal.value = false
  navigateTo('/auth/login')
}

const handleModalEsc = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && showDuplicateEmailModal.value) {
    showDuplicateEmailModal.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleModalEsc)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleModalEsc)
})
</script>
<template>
  <div class="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-x-hidden max-w-full">
    <!-- Hero Section with Background Image -->
    <div class="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden min-h-[160px] relative shadow-lg" style='background-image: url("https://lh3.googleusercontent.com/aida-public/AB6AXuDgikn6xndc6b81auSFUuHvXMxgVFzpZbjSBYb3vJeufHCcJJr6LwMi-N3ecO0zG7kVwdP6-PVDClIlHPVG6-O8QVCvp-vdXMOICqJWwfRnNneu6nNeHMTlR19yucoqXullhXJ07qvYjYxISAk4_nYAhG1wZtdVbiqG_yDA4ErihwyqBAYIcBjq3pnUbxovStiHkNuSeNPoFt3HGuKZitv_U3ooygHK6EKVcw_YT8KHAM2aFfCLgp3VN7bBRWRl917yYzsgu65hwMo");'>
      <!-- Overlay for text readability -->
      <div class="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent"></div>

      <!-- Top Logo -->
      <div class="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <LogoIcon size="sm" />
      </div>

      <!-- Header Content in Hero Section -->
      <div class="relative p-6">
        <h2 class="text-slate-900 text-2xl font-bold leading-tight tracking-tight">領袖會社青團</h2>
        <p class="text-slate-700 text-sm font-medium">加入我們的平靜社群</p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1">
      <!-- Header Text -->
      <div class="px-6 pt-6 pb-2">
        <h2 class="text-slate-900 dark:text-slate-100 text-3xl font-bold leading-tight">建立帳號</h2>
        <p class="text-slate-500 dark:text-slate-400 text-base font-normal mt-1">開始你的內心平靜與正念之旅。</p>
      </div>

      <!-- Registration Form -->
      <div class="flex flex-col gap-4 px-6 py-4">
        <!-- Full Name -->
        <label class="flex flex-col gap-2">
          <div class="relative group">
            <i class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">person</i>
            <input
              v-model="formData.fullName"
              type="text"
              placeholder="輸入你的姓名"
              class="form-input block w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
            />
          </div>
        </label>

        <!-- Email -->
        <label class="flex flex-col gap-2">
          <div class="relative group">
            <i class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">mail</i>
            <input
              v-model="formData.email"
              type="email"
              placeholder="輸入你的 Email"
              class="form-input block w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
            />
          </div>
        </label>

        <!-- Password -->
        <label class="flex flex-col gap-2">
          <div class="relative group">
            <i class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">lock</i>
            <input
              v-model="formData.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="建立密碼"
              class="form-input block w-full pl-12 pr-12 py-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
            />
            <button
              @click="showPassword = !showPassword"
              type="button"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <i class="material-symbols-outlined">{{ showPassword ? 'visibility_off' : 'visibility' }}</i>
            </button>
          </div>
        </label>

        <!-- Confirm Password -->
        <label class="flex flex-col gap-2">
          <div class="relative group">
            <i class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">lock</i>
            <input
              v-model="formData.confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              placeholder="再次輸入密碼"
              class="form-input block w-full pl-12 pr-12 py-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
            />
            <button
              @click="showPassword = !showPassword"
              type="button"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <i class="material-symbols-outlined">{{ showPassword ? 'visibility_off' : 'visibility' }}</i>
            </button>
          </div>
        </label>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col gap-4 px-6 py-6 mb-10">
        <!-- Notifications -->
        <div v-if="errorMessage" class="text-red-500 text-sm py-2 px-4 rounded-lg bg-red-500/10 mb-2">
          {{ errorMessage }}
        </div>
        <div v-if="successMessage" class="text-green-500 text-sm py-2 px-4 rounded-lg bg-green-500/10 mb-2">
          {{ successMessage }}
        </div>

        <button
          @click="handleRegister"
          :disabled="loading"
          class="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? '註冊中...' : '註冊' }}
        </button>
        <div class="flex items-center justify-center gap-2 mt-2">
          <p class="text-slate-500 dark:text-slate-400 text-sm">已有帳號？</p>
          <NuxtLink to="/auth/login" class="text-primary font-semibold text-sm hover:underline">返回登入</NuxtLink>
        </div>
      </div>
    </div>

    <!-- Footer Spacer for Mobile View -->
    <div class="h-6 bg-transparent"></div>

    <!-- Duplicate Email Modal -->
    <div
      v-if="showDuplicateEmailModal"
      @click.self="handleContinueRegister"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-6"
    >
      <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h3 class="text-lg font-bold text-slate-900">Email 已被註冊</h3>
        <p class="mt-2 text-sm leading-relaxed text-slate-600">
          這個 Email 已有帳號，請改用既有方式登入。
        </p>
        <div class="mt-6 flex gap-3">
          <button
            type="button"
            @click="handleContinueRegister"
            class="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            繼續註冊
          </button>
          <button
            type="button"
            @click="handleGoLogin"
            class="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:bg-primary/90"
          >
            前往登錄
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Material Symbols */
i {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

/* Form Input Styling */
input {
  box-sizing: border-box;
}

input:focus {
  outline: none;
}
</style>
