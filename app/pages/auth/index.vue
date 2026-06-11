<script setup lang="ts">
import LoginForm from './components/LoginForm.vue'
import RegisterForm from './components/RegisterForm.vue'

definePageMeta({
  layout: 'auth'
})

const { clearUserData } = useUser()
const mode = ref<'login' | 'register'>('login')

onMounted(() => {
  clearUserData()
})

const switchMode = (newMode: 'login' | 'register') => {
  mode.value = newMode
}
</script>

<template>
  <div class="flex flex-1 flex-col items-center justify-center px-6 py-10 sm:py-14">
    <div class="w-full max-w-sm rounded-3xl border border-white/20 bg-white/10 p-7 shadow-2xl backdrop-blur-xl">
      <div class="flex flex-col items-center gap-4 text-center">
        <LogoIcon size="lg" />
        <h1 class="text-white text-3xl font-bold tracking-widest drop-shadow-md">領袖會社青團</h1>
        <p class="text-sm leading-relaxed text-white/80">
          {{ mode === 'login' ? '提醒您使用報名活動的帳號登入。' : '建立您的帳號以參加社青團活動。' }}
        </p>
      </div>

      <div class="mt-8 flex flex-col gap-4">
        <LoginForm 
          v-if="mode === 'login'" 
          @switch-mode="switchMode" 
        />
        <RegisterForm 
          v-else 
          @switch-mode="switchMode" 
        />

        <p class="text-center text-[10px] text-white/40 mt-2">註冊即表示您同意本平台的服務條款與隱私政策。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Any additional styles for the index page can go here */
</style>
