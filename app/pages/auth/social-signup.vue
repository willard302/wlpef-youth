<script setup lang="ts">
import AuthInputField from './components/AuthInputField.vue'
import AuthButton from './components/AuthButton.vue'
import { getRoleDestination } from '~/utils/auth'

definePageMeta({
  layout: 'auth'
})

const router = useRouter()
const supabase = useSupabaseClient()
const { userProfile, completeSocialSignup, loadUserData } = useUser()

const { loading, errorMessage, handleAuthError } = useAuth()
const initializing = ref(true)

const formData = ref({
  email: '',
  fullName: ''
})

type SocialSignupField = {
  key: 'email' | 'fullName'
  label: string
  icon: string
  type: string
  placeholder: string
  helperText?: string
}

const formFields: SocialSignupField[] = [
  {
    key: 'fullName',
    label: '姓名',
    icon: 'person',
    type: 'text',
    placeholder: '輸入您的真實姓名'
  },
  {
    key: 'email',
    label: 'Email',
    icon: 'mail',
    type: 'email',
    placeholder: '請輸入 Email',
    helperText: '請確認您的 Email 為報名活動時所使用的。'
  }
]

const fetchUserData = async () => {
  try {
    initializing.value = true
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      errorMessage.value = '使用者未登入，請重新登入。'
      setTimeout(() => {
        router.push('/auth')
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
      .select('id, name')
      .eq('id', user.id)
      .maybeSingle()

    if (profile) {
      router.push('/home')
    } else {
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
    
    await completeSocialSignup({
      fullName: formData.value.fullName.trim(),
      points: 0
    })

    await loadUserData(true)

    // 根據角色導向
    const dest = getRoleDestination(userProfile.value?.role)
    await router.replace(dest)
  } catch (err: any) {
    handleAuthError(err, '完成註冊失敗，請稍後再試')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchUserData()
})
</script>

<template>
  <div class="flex flex-col items-center justify-center flex-1 px-6 py-10 sm:py-14">
    <div class="glass-card w-full max-w-sm p-7 space-y-8">
      
      <!-- Header -->
      <div class="text-center space-y-4">
        <div class="flex flex-col items-center gap-4">
          <LogoIcon size="md" />
          <h1 class="text-white text-2xl font-bold tracking-widest drop-shadow-md">完成註冊</h1>
        </div>
        <p class="text-white/80 text-sm leading-relaxed">請確認並填寫以下資訊以完成您的帳號設定。</p>
      </div>

      <!-- Initializing State -->
      <div v-if="initializing" class="py-12 flex flex-col items-center justify-center gap-4">
        <van-loading type="spinner" size="24px" color="#ffffff" />
        <p class="text-white/60 font-medium text-sm tracking-widest">正在載入...</p>
      </div>

      <!-- Form Section -->
      <div v-else class="flex flex-col gap-6">
        <div class="space-y-4">
          <div
            v-for="field in formFields"
            :key="field.key"
            class="space-y-2"
          >
            <AuthInputField
              v-model="formData[field.key]"
              :label="field.label"
              :icon="field.icon"
              :type="field.type"
              :placeholder="field.placeholder"
              :disabled="field.key === 'email' && !!formData.email"
            />
            <p v-if="field.helperText" class="text-white/40 text-[11px] leading-relaxed pl-1">{{ field.helperText }}</p>
          </div>
        </div>

        <!-- Error Message -->
        <transition name="fade">
          <div v-if="errorMessage" class="rounded-xl border border-red-300/40 bg-red-500/20 px-4 py-3 text-center text-xs text-red-100">
            {{ errorMessage }}
          </div>
        </transition>

        <!-- Submit Button -->
        <AuthButton
          @click="handleCompleteRegistration"
          variant="primary"
          :loading="loading"
          icon="done_all"
        >
          完成註冊
        </AuthButton>
      </div>
    </div>

    <!-- Footer Branding -->
    <p class="text-center text-[10px] text-white/40 mt-8">領袖會社青團官方平台</p>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
