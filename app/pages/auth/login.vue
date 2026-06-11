<script setup lang="ts">
import type { Database } from '@/types/database.types'
import type { LoginFormData, RegisterFormData } from '~/types/auth'

definePageMeta({
  layout: 'auth'
})

const router = useRouter()
const supabase = useSupabaseClient<Database>()
const { clearUserData } = useUser()

const loading = ref(false)
const errorMessage = ref('')
const showMoreOptions = ref(false)
const mode = ref<'login' | 'register'>('login')

const formData = ref<LoginFormData>({
  email: '',
  password: ''
})

const registerData = ref<RegisterFormData>({
  email: '',
  fullName: '',
  department: '',
  password: '',
  confirmPassword: ''
})

onMounted(() => {
  clearUserData()
})

const handleGoogleLogin = async () => {
  try {
    loading.value = true
    errorMessage.value = ''

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/confirm`
      }
    })

    if (error) throw error
  } catch (error: any) {
    if (error?.message?.includes('provider is not enabled')) {
      errorMessage.value = 'Google 登入尚未啟用，請聯絡管理員。'
    } else {
      errorMessage.value = error.message || '登入時發生錯誤。'
    }
    loading.value = false
  }
}

const handleEmailLogin = async () => {
  if (!formData.value.email || !formData.value.password) {
    errorMessage.value = '請輸入 Email 與密碼'
    return
  }

  try {
    loading.value = true
    errorMessage.value = ''
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.value.email,
      password: formData.value.password
    })
    if (error) throw error
    router.push('/home')
  } catch (error: any) {
    errorMessage.value = error.message || '登入失敗，請檢查您的帳號密碼。'
  } finally {
    loading.value = false
  }
}

const handleEmailSignup = async () => {
  if (!registerData.value.email || !registerData.value.password || !registerData.value.fullName) {
    errorMessage.value = '請填寫所有必填欄位'
    return
  }

  if (registerData.value.password !== registerData.value.confirmPassword) {
    errorMessage.value = '兩次輸入的密碼不一致'
    return
  }

  try {
    loading.value = true
    errorMessage.value = ''

    const { data, error } = await supabase.auth.signUp({
      email: registerData.value.email,
      password: registerData.value.password,
      options: {
        data: {
          name: registerData.value.fullName,
          full_name: registerData.value.fullName,
          department: registerData.value.department
        },
        emailRedirectTo: `${window.location.origin}/auth/confirm`
      }
    })

    if (error) throw error

    if (data.user && !data.session) {
      errorMessage.value = '註冊成功！請檢查您的郵箱以驗證帳號。'
    } else if (data.session) {
      router.push('/home')
    }
  } catch (error: any) {
    errorMessage.value = error.message || '註冊失敗'
  } finally {
    loading.value = false
  }
}

const toggleMode = () => {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  errorMessage.value = ''
}
</script>

<template>
  <div class="relative flex min-h-screen w-full flex-col overflow-hidden bg-background-light font-display">
    <!-- Background Image with Overlay -->
    <div class="absolute inset-0 z-0">
      <div
        class="h-full w-full bg-cover bg-center"
        style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAKLqnX9ZXB6k4S_M2OiUzo28rwbVbB4qgtt-CuoJnz7esDmG4EipwCVb159pJxmBEUzY0SIMcJffb8sBWx7x0cCktLUUeogL4l_7CKhM4tw-WrZapPYOiXOJ_wFK0XCHI8tjk2PkDynPSxN-hiE_8DwZJ0-k355BY8O0Jn4yeAvRUuQ6juPcePLPZzromKaH4sAy7R06qG24jk8u4mJDZr3UbyPmicNP-tofDjENIMKDtGvnRYe5SgAVTeEDieQCXIlvpG11VqryQ')"
      ></div>
      <div class="absolute inset-0 bg-primary/10"></div>
    </div>

    <!-- Content -->
    <div class="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-10 sm:py-14">
      <div class="w-full max-w-sm rounded-3xl border border-white/20 bg-white/10 p-7 shadow-2xl backdrop-blur-xl">
        <div class="flex flex-col items-center gap-4 text-center">
          <LogoIcon size="lg" />
          <h1 class="text-white text-3xl font-bold tracking-widest drop-shadow-md">領袖會社青團</h1>
          <p class="text-sm leading-relaxed text-white/80">
            {{ mode === 'login' ? '提醒您使用報名活動的帳號登入。' : '建立您的帳號以參加社青團活動。' }}
          </p>
        </div>

        <div class="mt-8 flex flex-col gap-4">
          <!-- Login Modes -->
          <template v-if="mode === 'login'">
            <van-button
              @click="handleGoogleLogin"
              :disabled="loading"
              block
              class="login-btn !h-14 !rounded-2xl !bg-white !text-[#1f2937] !font-semibold !border-none"
            >
              <div class="flex items-center justify-center gap-3">
                <svg class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span class="tracking-wide">使用 Google 登入</span>
              </div>
            </van-button>

            <!-- More Options Toggle -->
            <div class="text-center">
              <button 
                v-if="!showMoreOptions"
                @click="showMoreOptions = true"
                class="text-xs text-white/60 hover:text-white transition-colors underline decoration-white/30"
              >
                顯示更多登入方式
              </button>
            </div>

            <!-- Email Login Form -->
            <div v-if="showMoreOptions" class="flex flex-col gap-3 mt-2 animate-fade-in">
              <div class="relative">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-xl">mail</span>
                <input
                  v-model="formData.email"
                  type="email"
                  placeholder="Email"
                  class="w-full h-12 bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-all"
                />
              </div>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-xl">lock</span>
                <input
                  v-model="formData.password"
                  type="password"
                  placeholder="密碼"
                  class="w-full h-12 bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-all"
                />
              </div>
              <van-button
                @click="handleEmailLogin"
                :loading="loading"
                block
                class="!h-12 !rounded-xl !bg-primary !text-white !font-bold !border-none"
              >
                登入
              </van-button>
              
              <div class="flex justify-between items-center px-1 mt-1">
                <button @click="toggleMode" class="text-xs text-white/80 hover:text-white">還沒有帳號？立即註冊</button>
                <button @click="showMoreOptions = false" class="text-xs text-white/40 hover:text-white">收起</button>
              </div>
            </div>
          </template>

          <!-- Register Mode -->
          <template v-else>
            <div class="flex flex-col gap-3 animate-fade-in">
              <div class="relative">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-xl">person</span>
                <input
                  v-model="registerData.fullName"
                  type="text"
                  placeholder="真實姓名 (必填)"
                  class="w-full h-12 bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-all"
                />
              </div>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-xl">mail</span>
                <input
                  v-model="registerData.email"
                  type="email"
                  placeholder="Email (必填)"
                  class="w-full h-12 bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-all"
                />
              </div>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-xl">lock</span>
                <input
                  v-model="registerData.password"
                  type="password"
                  placeholder="設定密碼"
                  class="w-full h-12 bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-all"
                />
              </div>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-xl">lock_reset</span>
                <input
                  v-model="registerData.confirmPassword"
                  type="password"
                  placeholder="確認密碼"
                  class="w-full h-12 bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-all"
                />
              </div>
              
              <van-button
                @click="handleEmailSignup"
                :loading="loading"
                block
                class="!h-12 !rounded-xl !bg-primary !text-white !font-bold !border-none mt-2"
              >
                立即註冊
              </van-button>

              <button @click="toggleMode" class="text-xs text-white/80 hover:text-white mt-1">已有帳號？返回登入</button>
            </div>
          </template>

          <p class="text-center text-[10px] text-white/40 mt-2">註冊即表示您同意本平台的服務條款與隱私政策。</p>

          <div v-if="errorMessage" class="rounded-xl border border-red-300/40 bg-red-500/20 px-4 py-3 text-center text-xs text-red-100 mt-2">
            {{ errorMessage }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-btn {
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
}

.login-btn:active {
  transform: scale(0.98);
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
