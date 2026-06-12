<script setup lang="ts">
import type { RegisterFormData } from '~/types/auth'

const emit = defineEmits(['switchMode'])
const {
  loading,
  errorMessage,
  signupWithEmail
} = useAuth()


const registerData = ref<RegisterFormData>({
  email: '',
  fullName: '',
  password: '',
  confirmPassword: ''
})

</script>

<template>
  <form @submit.prevent="signupWithEmail(registerData)" class="flex flex-col gap-3 animate-fade-in">
    <div class="relative">
      <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-xl">person</span>
      <input
        v-model="registerData.fullName"
        type="text"
        placeholder="真實姓名 (必填)"
        class="w-full h-12 bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-all"
        autocomplete="name"
      />
    </div>
    <div class="relative">
      <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-xl">mail</span>
      <input
        v-model="registerData.email"
        type="email"
        placeholder="Email (必填)"
        class="w-full h-12 bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-all"
        autocomplete="username"
      />
    </div>
    <div class="relative">
      <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-xl">lock</span>
      <input
        v-model="registerData.password"
        type="password"
        placeholder="設定密碼"
        class="w-full h-12 bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-all"
        autocomplete="new-password"
      />
    </div>
    <div class="relative">
      <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-xl">lock_reset</span>
      <input
        v-model="registerData.confirmPassword"
        type="password"
        placeholder="確認密碼"
        class="w-full h-12 bg-white/10 border border-white/20 rounded-xl pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-all"
        autocomplete="new-password"
      />
    </div>
    
    <van-button
      @click="signupWithEmail(registerData)"
      :loading="loading"
      block
      class="!h-12 !rounded-xl !bg-primary !text-white !font-bold !border-none mt-2"
    >
      立即註冊
    </van-button>

    <button
      type="button" 
      @click="emit('switchMode', 'login')" 
      class="text-xs text-white/80 hover:text-white mt-1"
    >已有帳號？返回登入</button>

    <div v-if="errorMessage" class="rounded-xl border border-red-300/40 bg-red-500/20 px-4 py-3 text-center text-xs text-red-100 mt-2">
      {{ errorMessage }}
    </div>
  </form>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
