<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const router = useRouter()
const supabase = useSupabaseClient()
const loading = ref(false)
const initializing = ref(true)
const errorMessage = ref('')

const formData = ref({
  email: '',
  fullName: '',
  department: '',
  bio: ''
})

type SocialSignupField = {
  key: keyof typeof formData.value
  label: string
  icon: string
  type: string
  placeholder: string
  rows?: number
  helperText?: string
}

const formFields: SocialSignupField[] = [
  {
    key: 'email',
    label: 'Email',
    icon: 'mail',
    type: 'email',
    placeholder: '請輸入 Email',
    helperText: '請確認您的Email為您報名活動所使用的Email'
  },
  {
    key: 'fullName',
    label: '姓名',
    icon: 'badge',
    type: 'text',
    placeholder: '輸入您的真實姓名'
  }
]

// Fetch existing user data if any
const fetchUserData = async () => {
  try {
    initializing.value = true
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      errorMessage.value = '使用者未登入，請重新登入。'
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
      return
    }

    formData.value.email = user.email || ''

    // 檢查 metadata 是否已標記完成
    const metadata = user.user_metadata || {}
    if (metadata.social_signup_completed || metadata.google_signup_completed) {
      router.push('/home')
      return
    }

    // Try to get existing profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, department, bio')
      .eq('id', user.id)
      .maybeSingle()

    if (profile) {
      // 如果資料庫已有 profile，也視為已完成
      router.push('/home')
      return
    } else {
      // Fallback to metadata for initial display
      formData.value.fullName = metadata.full_name || metadata.name || ''
    }
  } catch (err: any) {
    console.error('Error fetching user data:', err)
    errorMessage.value = '載入使用者資訊失敗'
  } finally {
    initializing.value = false
  }
}

const handleCompleteRegistration = async () => {
  if (!formData.value.email.trim()) {
    errorMessage.value = '缺少 Email，請重新以 Google 或 Apple 登入'
    return
  }

  if (!formData.value.fullName.trim()) {
    errorMessage.value = '請填寫您的真實姓名'
    return
  }

  try {
    loading.value = true
    errorMessage.value = ''

    const { completeSocialSignup } = useUser()
    
    await completeSocialSignup({
      fullName: formData.value.fullName.trim(),
      points: 0
    })

    router.push('/home')
  } catch (err: any) {
    console.error('Error completing registration:', err)
    if (err?.code === '22023' && String(err?.message || '').includes('role')) {
      errorMessage.value = '帳號角色設定異常，請先登出後重新登入；若仍失敗請聯絡管理員。'
    } else {
      errorMessage.value = err.message || '完成註冊失敗'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchUserData()
})
</script>

<template>
  <div class="flex flex-col items-center justify-center flex-1 px-6 py-12">
    <div class="w-full max-w-sm glass-effect rounded-[2.5rem] flex flex-col gap-8 bg-white/80 backdrop-blur-xl p-8 shadow-2xl shadow-sky-200/50 border border-white/20">
      
      <!-- Header -->
      <div class="text-center space-y-3">
        <div class="size-20 bg-sky-500 rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
          <span class="material-symbols-outlined text-white text-4xl">person_add</span>
        </div>
        <h1 class="text-slate-900 text-2xl font-bold tracking-tight">歡迎加入</h1>
        <p class="text-slate-500 text-sm font-medium text-left">確認以下資訊以完成領袖會社青團活動中心的註冊流程。</p>
      </div>

      <!-- Initializing State -->
      <div v-if="initializing" class="py-12 flex flex-col items-center justify-center gap-4">
        <div class="size-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sky-600 font-bold text-sm tracking-widest">正在載入...</p>
      </div>

      <!-- Form Section -->
      <div v-else class="flex flex-col gap-5">
        <div
          v-for="field in formFields"
          :key="field.key"
          class="space-y-1.5"
        >
          <FormField
            v-model="formData[field.key]"
            :label="field.label"
            :icon="field.icon"
            :type="field.type"
            :placeholder="field.placeholder"
            :rows="field.rows"
          />
          <p v-if="field.helperText" class="text-red-600 text-xs font-medium text-left pl-2 pr-2">{{ field.helperText }}</p>
        </div>

        <!-- Error Message -->
        <transition name="fade">
          <div v-if="errorMessage" class="flex items-center gap-2 p-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold border border-red-100">
            <span class="material-symbols-outlined text-base flex-shrink-0">error</span>
            {{ errorMessage }}
          </div>
        </transition>

        <!-- Submit Button -->
        <button
          @click="handleCompleteRegistration"
          :disabled="loading"
          class="group relative w-full h-14 bg-sky-500 text-white font-bold rounded-2xl shadow-lg shadow-sky-500/30 overflow-hidden transition-all hover:bg-sky-600 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
        >
          <div class="relative z-10 flex items-center justify-center gap-2">
            <span v-if="loading" class="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span v-else class="material-symbols-outlined text-xl">done_all</span>
            <span class="tracking-widest">{{ loading ? '正在處理...' : '完成註冊' }}</span>
          </div>
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
        </button>
      </div>
    </div>

    <!-- Footer Branding -->
    <p class="mt-8 text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-2">
      <span class="w-8 h-[1px] bg-slate-200"></span>
      領袖會社青團
      <span class="w-8 h-[1px] bg-slate-200"></span>
    </p>
  </div>
</template>

<style scoped lang="scss">
.animate-bounce-slow {
  animation: bounce 3s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(-5%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
  50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type=number] {
  appearance: textfield;
  -moz-appearance: textfield;
}
</style>
