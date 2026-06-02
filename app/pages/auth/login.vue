<script setup lang="ts">
import { ref } from 'vue'
import type { LoginFormData } from '@/types'

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

const supabase = useSupabaseClient()
const loading = ref(false)
const errorMessage = ref('')

const isPasswordRecoveryCookie = useCookie('is_password_recovery')
onMounted(() => {
  isPasswordRecoveryCookie.value = null
})

type OAuthProvider = 'google' | 'apple'

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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: existingProfile, error: profileQueryError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileQueryError) {
      throw profileQueryError
    }

    if (!existingProfile) {
      const metadata = user.user_metadata || {}
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          name: metadata.name || metadata.display_name || user.email?.split('@')[0] || 'User',
          avatar_url: metadata.avatar_url || null,
          role: 'member',
          points: 0
        })

      if (createProfileError) {
        await supabase.auth.signOut()
        throw new Error('首次登入初始化失敗，請聯絡管理員確認 profiles 權限設定')
      }
    }
    
    router.push('/home')
  } catch (error: any) {
    if (error?.message?.includes('Invalid login credentials')) {
      errorMessage.value = '登入時發生錯誤。'
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

    if (error) {
      throw error
    }
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

const handleGoogleLogin = async () => {
  await handleOAuthLogin('google')
}

const handleAppleLogin = async () => {
  await handleOAuthLogin('apple')
}
</script>

<template>
  <div class="relative flex h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark font-display">
    <!-- Background Image with Overlay -->
    <div class="absolute inset-0 z-0">
      <div
        class="h-full w-full bg-cover bg-center"
        style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAKLqnX9ZXB6k4S_M2OiUzo28rwbVbB4qgtt-CuoJnz7esDmG4EipwCVb159pJxmBEUzY0SIMcJffb8sBWx7x0cCktLUUeogL4l_7CKhM4tw-WrZapPYOiXOJ_wFK0XCHI8tjk2PkDynPSxN-hiE_8DwZJ0-k355BY8O0Jn4yeAvRUuQ6juPcePLPZzromKaH4sAy7R06qG24jk8u4mJDZr3UbyPmicNP-tofDjENIMKDtGvnRYe5SgAVTeEDieQCXIlvpG11VqryQ')"
      ></div>
      <div class="absolute inset-0 bg-primary/10"></div>
    </div>

    <!-- Content -->
    <div class="relative z-10 flex flex-col items-center justify-between h-full px-6 py-12 overflow-y-auto">

      <!-- Center Content -->
      <div class="flex flex-col items-center gap-6 w-full">
        <!-- Logo -->
        <LogoIcon size="lg" />

        <!-- Title -->
        <div class="text-center">
          <h1 class="text-white text-3xl font-bold tracking-widest drop-shadow-md">領袖會社青團</h1>
        </div>

        <!-- Form -->
        <div class="w-full max-w-sm flex flex-col gap-4">
          <FormInput
            v-for="field in fields"
            :key="field.key"
            v-model="formData[field.key]"
            :icon="field.icon"
            :type="field.type"
            :placeholder="field.placeholder"
            :autocomplete="field.autocomplete"
          />

          <!-- Error Message -->
          <div v-if="errorMessage" class="text-red-400 text-sm text-center bg-red-400/10 py-2 rounded-lg">
            {{ errorMessage }}
          </div>

          <!-- Login Button -->
          <button
            @click="handleLogin"
            :disabled="loading"
            class="w-full bg-primary text-white font-bold py-3 rounded-xl glow-button text-lg tracking-wide hover:bg-primary/90 transition-all active:scale-[0.8] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? '登入中...' : '登入' }}
          </button>

          <!-- Links -->
          <div class="flex justify-between px-2">
            <NuxtLink to="/auth/forget-password" class="text-white/80 text-sm hover:text-white transition-colors">忘記密碼？</NuxtLink>
            <NuxtLink to="/auth/register" class="text-white/80 text-sm font-semibold hover:text-white transition-colors border-b border-white/30">註冊</NuxtLink>
          </div>
        </div>
      </div>

      <!-- Social Login -->
      <div class="flex flex-col items-center gap-4 mt-4 w-full">
        <div class="flex items-center gap-4 w-full max-w-sm">
          <div class="h-[1px] flex-1 bg-white/20"></div>
          <span class="text-white/80 text-xs uppercase tracking-widest">或使用以下方式繼續</span>
          <div class="h-[1px] flex-1 bg-white/20"></div>
        </div>
        <div class="flex gap-4">
          <button 
            @click="handleGoogleLogin"
            type="button"
            :disabled="loading"
            class="size-12 rounded-full glass-effect flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            title="使用 Google 登入"
          >
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </button>
          <button
            @click="handleAppleLogin"
            type="button"
            :disabled="loading"
            class="size-12 rounded-full glass-effect flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            title="使用 Apple 登入"
          >
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16.365 12.384c.024 2.648 2.338 3.53 2.364 3.542-.02.062-.37 1.27-1.217 2.516-.73 1.077-1.487 2.149-2.68 2.171-1.171.022-1.548-.696-2.887-.696-1.34 0-1.758.674-2.866.718-1.15.043-2.025-1.154-2.761-2.227-1.502-2.194-2.649-6.206-1.108-8.88.766-1.328 2.136-2.168 3.624-2.19 1.131-.022 2.199.763 2.887.763.689 0 1.98-.944 3.338-.805.568.024 2.163.229 3.186 1.725-.083.051-1.901 1.107-1.88 3.363Zm-2.007-6.695c.613-.742 1.026-1.775.913-2.805-.884.036-1.952.588-2.586 1.329-.57.659-1.069 1.713-.934 2.722.986.076 1.994-.502 2.607-1.246Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
i {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>
