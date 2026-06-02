<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const supabase = useSupabaseClient()

const email = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const countdown = ref(0)
let timer: any = null

const startCountdown = () => {
  countdown.value = 60
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
}

const handleSendResetCode = async () => {
  errorMessage.value = ''
  
  if (!email.value.trim()) {
    errorMessage.value = '請輸入 Email'
    return
  }

  try {
    loading.value = true
    
    const {error} = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })

    if (error) throw error

    successMessage.value = `重設密碼信已發送到${email.value}，請檢查收件匣。`
    startCountdown()
  } catch (error: any) {
    console.error('Error sending reset code:', error)
    errorMessage.value = '發送重設密碼信失敗，請稍後再試。'
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
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
        <p class="text-slate-700 text-sm font-medium">重設您的帳號密碼</p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1">
      <!-- Header Text -->
      <div v-if="!successMessage" class="px-6 pt-6 pb-2">
        <h2 class="text-slate-900 dark:text-slate-100 text-3xl font-bold leading-tight">忘記密碼</h2>
        <p class="text-slate-500 dark:text-slate-400 text-base font-normal mt-1">
          {{ '請輸入您的電子郵件以重設密碼。' }}
        </p>
      </div>

      <!-- Success State -->
      <div v-if="successMessage" class="px-6 py-8 flex flex-col items-center gap-6 animate-fade-in">
        <div class="size-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
          <span class="material-symbols-outlined text-4xl">mark_email_read</span>
        </div>
        <div class="text-center space-y-2">
          <p class="text-slate-900 dark:text-slate-100 font-bold text-lg">{{ successMessage }}</p>
          <div class="flex flex-col gap-1">
            <p class="text-slate-500 dark:text-slate-400 text-sm">若沒看到信件，請檢查垃圾郵件匣。</p>
          </div>
        </div>

        <div class="w-full flex flex-col gap-3">
          <button
            @click="handleSendResetCode"
            :disabled="countdown > 0 || loading"
            class="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ countdown > 0 ? `重新發送 (${countdown}s)` : (loading ? '傳送中...' : '重新發送信件') }}
          </button>

          <NuxtLink 
            to="/auth/login" 
            class="text-primary font-bold py-2 text-center hover:underline"
          >
            返回登入
          </NuxtLink>
        </div>
      </div>

      <!-- Form State -->
      <form v-else @submit.prevent="handleSendResetCode" class="flex flex-col gap-4 px-6 py-4">
        <FormField
          v-model="email"
          icon="mail"
          type="email"
          placeholder="輸入您的 Email"
          autocomplete="email"
        />

        <!-- Error Message -->
        <div v-if="errorMessage" class="text-red-500 text-sm font-medium px-1">
          {{ errorMessage }}
        </div>

        <!-- Buttons -->
        <div class="flex flex-col gap-4 py-2 mb-10">
          <button
            type="submit"
            :disabled="!email || loading"
            class="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? '傳送中...' : '發送重設信件' }}
          </button>
          <div class="flex items-center justify-center gap-2">
            <p class="text-slate-500 dark:text-slate-400 text-sm">記得密碼了？</p>
            <NuxtLink to="/auth/login" class="text-primary font-semibold text-sm hover:underline">返回登入</NuxtLink>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
