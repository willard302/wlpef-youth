<script setup lang="ts">
import type { RegisterFormData } from '@/types'

definePageMeta({
  layout: 'auth'
})

const formData = ref<RegisterFormData>({
  email: '',
  fullName: '',
  department: '',
  password: '',
  confirmPassword: ''
})

type FieldKey = keyof RegisterFormData

const fields: { key: FieldKey; icon: string; placeholder: string; type?: 'email' | 'password'; autocomplete: string }[] = [
  { key: 'email',            icon: 'mail',   placeholder: '輸入您的 Email',         type: 'email',    autocomplete: 'email' },
  { key: 'fullName',         icon: 'person', placeholder: '輸入您的姓名',           autocomplete: 'name' },
  { key: 'department',       icon: 'business', placeholder: '輸入您的校友會',           autocomplete: 'organization' },
  { key: 'password',         icon: 'lock',   placeholder: '建立密碼（至少 6 個字元）', type: 'password', autocomplete: 'new-password' },
  { key: 'confirmPassword',  icon: 'lock',   placeholder: '再次輸入密碼',            type: 'password', autocomplete: 'new-password' },
]

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

  if (!formData.value.department.trim()) {
    errorMessage.value = '請填寫校友會欄位。'
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
    setTimeout(() => navigateTo('/auth/login'), 2000)

  } catch (error: any) {
    const message = error?.message || ''

    if (message.toLowerCase().includes('already registered')) {
      errorMessage.value = ''
      showDuplicateEmailModal.value = true
      return
    }

    errorMessage.value = message || '註冊時發生錯誤，請稍後再試。'
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

const closeModalOnEsc = (event: KeyboardEvent) => {
  if (event.key === 'Escape') showDuplicateEmailModal.value = false
}

onMounted(() => window.addEventListener('keydown', closeModalOnEsc))
onBeforeUnmount(() => window.removeEventListener('keydown', closeModalOnEsc))
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
      <form @submit.prevent="handleRegister" class="flex flex-col gap-4 px-6 py-4">
        <FormInput
          v-for="field in fields"
          :key="field.key"
          v-model="formData[field.key]"
          :icon="field.icon"
          :type="field.type"
          :placeholder="field.placeholder"
          :autocomplete="field.autocomplete"
        />

        <!-- Notifications -->
        <div v-if="errorMessage" role="alert" class="text-red-500 text-sm py-2 px-4 rounded-lg bg-red-500/10">
          {{ errorMessage }}
        </div>
        <div v-if="successMessage" role="status" class="text-green-500 text-sm py-2 px-4 rounded-lg bg-green-500/10">
          {{ successMessage }}
        </div>

        <!-- Submit Button -->
        <div class="flex flex-col gap-4 py-2 mb-10">
          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? '註冊中...' : '註冊' }}
          </button>
          <div class="flex items-center justify-center gap-2">
            <p class="text-slate-500 dark:text-slate-400 text-sm">已有帳號？</p>
            <NuxtLink to="/auth/login" class="text-primary font-semibold text-sm hover:underline">返回登入</NuxtLink>
          </div>
        </div>
      </form>
    </div>

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

