<script setup lang="ts">
import type { Database } from '@/types/database.types'

definePageMeta({
  layout: 'auth'
})

const supabase = useSupabaseClient<Database>()
const loading = ref(false)
const errorMessage = ref('')

const { clearUserData } = useUser()

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
      <!-- <div class="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/60"></div> -->
    </div>

    <!-- Content -->
    <div class="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-10 sm:py-14">
      <div class="w-full max-w-sm rounded-3xl border border-white/20 bg-white/10 p-7 shadow-2xl backdrop-blur-xl">
        <div class="flex flex-col items-center gap-4 text-center">
          <LogoIcon size="lg" />
          <h1 class="text-white text-3xl font-bold tracking-widest drop-shadow-md">領袖會社青團</h1>
          <p class="text-sm leading-relaxed text-white/80">提醒您使用報名活動的Google帳號登入。</p>
        </div>

        <div class="mt-8 flex flex-col gap-4">
          <van-button
            @click="handleGoogleLogin"
            :loading="loading"
            loading-text="導向 Google..."
            :disabled="loading"
            block
            class="google-login-btn !h-14 !rounded-2xl !bg-white !text-[#1f2937] !font-semibold !border-none"
          >
            <div class="flex items-center justify-center gap-3">
              <svg class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span class="tracking-wide">使用 Google 登入</span>
            </div>
          </van-button>

          <p class="text-center text-xs text-white">登入即表示你同意服務條款與隱私政策。</p>

          <div v-if="errorMessage" class="rounded-xl border border-red-300/40 bg-red-500/20 px-4 py-3 text-center text-xs text-red-100">
            {{ errorMessage }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.google-login-btn {
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.google-login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
}

.google-login-btn:active {
  transform: scale(0.98);
}
</style>
