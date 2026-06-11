<script setup lang="ts">
import type { LoginFormData } from '~/types/auth'

const emit = defineEmits(['switchMode'])

const {
  loading, 
  errorMessage,
  loginWithGoogle,
  loginWithEmail
} = useAuth()

const showMoreOptions = ref(false)

const formData = ref<LoginFormData>({
  email: '',
  password: ''
})

</script>

<template>
  <div class="flex flex-col gap-4">
    <van-button
      @click="loginWithGoogle"
      :disabled="loading"
      block
      class="login-btn !h-14 !rounded-2xl !bg-white !text-[#1f2937] !font-semibold !border-none"
    >
      <div class="flex items-center justify-center gap-3">
        <div class="google-logo h-6 w-6" />
        <span class="tracking-wide">使用 Google 登入</span>
      </div>
    </van-button>

    <div class="text-center">
      <button 
        v-if="!showMoreOptions"
        @click="showMoreOptions = true"
        class="text-xs text-white/60 hover:text-white transition-colors underline decoration-white/30"
      >
        顯示更多登入方式
      </button>
    </div>

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
        @click="loginWithEmail(formData)"
        :loading="loading"
        block
        class="!h-12 !rounded-xl !bg-primary !text-white !font-bold !border-none"
      >
        登入
      </van-button>
      
      <div class="flex justify-between items-center px-1 mt-1">
        <button 
          @click="emit('switchMode', 'register')" 
          class="text-xs text-white/80 hover:text-white"
        >還沒有帳號？立即註冊</button>
        <button 
          @click="showMoreOptions = false" 
          class="text-xs text-white/40 hover:text-white"
        >收起</button>
      </div>
    </div>

    <div v-if="errorMessage" class="rounded-xl border border-red-300/40 bg-red-500/20 px-4 py-3 text-center text-xs text-red-100 mt-2">
      {{ errorMessage }}
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

.google-logo {
  background-image: url('/images/google-logo.svg');
  background-size: cover;
  background-position: center;
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
