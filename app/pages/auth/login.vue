<script setup lang="ts">
import type { LoginFormData } from '@/types'
import type { Database } from '@/types/database.types'

definePageMeta({
  layout: 'auth'
})

const formData = ref<LoginFormData>({
  email: '',
  password: ''
})

type FieldKey = keyof LoginFormData

const fields: { key: FieldKey; icon: string; placeholder: string; type?: 'email' | 'password'; autocomplete: string }[] = [
  { key: 'email',    icon: 'mail', placeholder: '輸入你的 Email', type: 'email',    autocomplete: 'email' },
  { key: 'password', icon: 'lock', placeholder: '輸入你的密碼',   type: 'password', autocomplete: 'current-password' },
]

const supabase = useSupabaseClient<Database>()
const loading = ref(false)
const errorMessage = ref('')
const showEmailForm = ref(false)

const isPasswordRecoveryCookie = useCookie('is_password_recovery')
const { clearUserData } = useUser()

onMounted(() => {
  isPasswordRecoveryCookie.value = null
  clearUserData()
})

type OAuthProvider = 'google' | 'apple'

const loginMethods = [
  { 
    id: 'google', 
    label: '使用 Google 登入', 
    icon: 'google',
    action: () => handleOAuthLogin('google')
  },
  { 
    id: 'apple', 
    label: '使用 Apple 登入', 
    icon: 'apple',
    action: () => handleOAuthLogin('apple')
  },
  { 
    id: 'email', 
    label: '一般 Email 登入', 
    icon: 'mail', 
    action: () => { showEmailForm.value = true }
  }
]

const handleLogin = async () => {
  const router = useRouter()
  
  if (!formData.value.email || !formData.value.password) {
    errorMessage.value = '請輸入 Email 和密碼。'
    return
  }

  try {
    loading.value = true
    errorMessage.value = ''
    
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.value.email,
      password: formData.value.password,
    })
    
    if (error) throw error

    router.push('/home')
  } catch (error: any) {
    if (error?.message?.includes('Invalid login credentials')) {
      errorMessage.value = '登入資訊錯誤，請檢查帳號密碼。'
    } else {
      errorMessage.value = error.message || '登入時發生錯誤。'
    }
  } finally {
    loading.value = false
  }
}

const handleOAuthLogin = async (provider: OAuthProvider) => {
  try {
    loading.value = true
    errorMessage.value = ''

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/confirm`,
        scopes: provider === 'apple' ? 'email name' : undefined
      }
    })

    if (error) throw error
  } catch (error: any) {
    if (error?.message?.includes('provider is not enabled')) {
      errorMessage.value = provider === 'apple'
        ? 'Apple 登入尚未啟用，請聯絡管理員。'
        : 'Google 登入尚未啟用，請聯絡管理員。'
    } else {
      errorMessage.value = error.message || '登入時發生錯誤。'
    }
    loading.value = false
  }
}
</script>

<template>
  <div class="relative flex h-screen w-full flex-col overflow-hidden bg-background-light font-display">
    <!-- Background Image with Overlay -->
    <div class="absolute inset-0 z-0">
      <div
        class="h-full w-full bg-cover bg-center"
        style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAKLqnX9ZXB6k4S_M2OiUzo28rwbVbB4qgtt-CuoJnz7esDmG4EipwCVb159pJxmBEUzY0SIMcJffb8sBWx7x0cCktLUUeogL4l_7CKhM4tw-WrZapPYOiXOJ_wFK0XCHI8tjk2PkDynPSxN-hiE_8DwZJ0-k355BY8O0Jn4yeAvRUuQ6juPcePLPZzromKaH4sAy7R06qG24jk8u4mJDZr3UbyPmicNP-tofDjENIMKDtGvnRYe5SgAVTeEDieQCXIlvpG11VqryQ')"
      ></div>
      <div class="absolute inset-0 bg-primary/10"></div>
    </div>

    <!-- Content -->
    <div class="relative z-10 flex flex-col items-center justify-center h-full px-6 py-12 overflow-y-auto">

      <!-- Center Content -->
      <div class="flex flex-col items-center gap-8 w-full max-w-sm">
        <!-- Logo & Title -->
        <div class="flex flex-col items-center gap-4">
          <LogoIcon size="lg" />
          <h1 class="text-white text-3xl font-bold tracking-widest drop-shadow-md text-center">領袖會社青團</h1>
        </div>

        <!-- Login Methods (Social & Email Toggle) -->
        <div v-if="!showEmailForm" class="flex flex-col gap-4 w-full">
          <van-button
            v-for="method in loginMethods"
            :key="method.id"
            @click="method.action"
            :disabled="loading"
            block
            class="!h-14 !rounded-2xl !bg-white/20 !backdrop-blur-[12px] !border !border-white/30 !text-white hover:!bg-white/40 transition-all active:scale-[0.98] !border-none"
          >
            <div class="flex items-center justify-center gap-3">
              <!-- Google Icon -->
              <svg v-if="method.id === 'google'" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <!-- Apple Icon -->
              <svg v-else-if="method.id === 'apple'" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.365 12.384c.024 2.648 2.338 3.53 2.364 3.542-.02.062-.37 1.27-1.217 2.516-.73 1.077-1.487 2.149-2.68 2.171-1.171.022-1.548-.696-2.887-.696-1.34 0-1.758.674-2.866.718-1.15.043-2.025-1.154-2.761-2.227-1.502-2.194-2.649-6.206-1.108-8.88.766-1.328 2.136-2.168 3.624-2.19 1.131-.022 2.199.763 2.887.763.689 0 1.98-.944 3.338-.805.568.024 2.163.229 3.186 1.725-.083.051-1.901 1.107-1.88 3.363Zm-2.007-6.695c.613-.742 1.026-1.775.913-2.805-.884.036-1.952.588-2.586 1.329-.57.659-1.069 1.713-.934 2.722.986.076 1.994-.502 2.607-1.246Z" />
              </svg>
              <!-- Mail Icon -->
              <span v-else-if="method.id === 'email'" class="material-symbols-outlined text-2xl">mail</span>
              
              <span class="font-medium tracking-wide">{{ method.label }}</span>
            </div>
          </van-button>
        </div>

        <!-- Form Section (Conditional) -->
        <transition name="fade">
          <div v-if="showEmailForm" class="w-full flex flex-col gap-4">
            <!-- Separator for context -->
            <div class="flex items-center gap-4 w-full mb-2">
              <div class="h-[1px] flex-1 bg-white/20"></div>
              <span class="text-white/60 text-[10px] uppercase tracking-[0.2em] font-bold">Email 登入</span>
              <div class="h-[1px] flex-1 bg-white/20"></div>
            </div>

            <FormField
              v-for="field in fields"
              :key="field.key"
              v-model="formData[field.key]"
              :icon="field.icon"
              :type="field.type"
              :placeholder="field.placeholder"
              :autocomplete="field.autocomplete"
            />

            <!-- Error Message -->
            <div v-if="errorMessage" class="text-red-200 text-xs text-center bg-red-500/20 py-2.5 px-4 rounded-xl border border-red-500/30 backdrop-blur-sm">
              {{ errorMessage }}
            </div>

            <!-- Login Button -->
            <van-button
              @click="handleLogin"
              :loading="loading"
              loading-text="登入中..."
              block
              class="!h-14 !bg-primary !text-white !font-bold !rounded-2xl glow-button !text-lg !tracking-widest hover:!bg-primary/90 transition-all active:scale-[0.96] !border-none mt-2"
            >
              登入
            </van-button>

            <!-- Links -->
            <div class="flex justify-between px-2 mt-2">
              <NuxtLink to="/auth/forget-password" class="text-white/60 text-xs hover:text-white transition-colors">忘記密碼？</NuxtLink>
              <button @click="showEmailForm = false" class="text-white/60 text-xs hover:text-white transition-colors font-bold">返回登入選項</button>
            </div>
          </div>
        </transition>

        <!-- Common Register Link -->
        <div class="flex items-center gap-2 mt-4">
          <span class="text-white/40 text-xs">還沒有帳號？</span>
          <NuxtLink to="/auth/register" class="text-white/90 text-xs font-bold hover:text-white transition-colors">立即註冊</NuxtLink>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
i {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
