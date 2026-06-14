<script setup lang="ts">
import type { LoginFormData } from '~/types/auth'
import AuthInputField from './AuthInputField.vue'

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

const fields = [
  {
    id: 'email',
    label: '帳號',
    icon: 'mail',
    type: 'text',
    placeholder: '請輸入帳號(Email)',
    autocomplete: 'username'
  },
  {
    id: 'password',
    label: '密碼',
    icon: 'lock',
    type: 'password',
    placeholder: '請輸入密碼',
    autocomplete: 'current-password'
  }
]

</script>

<template>
  <div class="flex flex-col gap-4">
    <van-button
      @click="loginWithGoogle"
      :disabled="loading"
      block
      class="google-login-btn !h-14 !rounded-2xl !bg-white/10 !backdrop-blur-md !text-white !font-bold !border !border-white/20"
    >
      <div class="flex items-center justify-center gap-3">
        <div class="google-logo size-6" />
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

    <form v-if="showMoreOptions" @submit.prevent="loginWithEmail(formData)" class="flex flex-col gap-3 mt-2 animate-fade-in">
      <AuthInputField
        v-for="field in fields"
        :key="field.id"
        v-model="formData[field.id as keyof LoginFormData]"
        :type="field.type"
        :icon="field.icon"
        :placeholder="field.placeholder"
        :autocomplete="field.autocomplete"
      />
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
          type="button" 
          @click="emit('switchMode', 'register')" 
          class="text-xs text-white/80 hover:text-white"
        >還沒有帳號？立即註冊</button>
        <button 
          type="button"
          @click="showMoreOptions = false" 
          class="text-xs text-white/40 hover:text-white"
        >收起</button>
      </div>
    </form>

    <div v-if="errorMessage" class="rounded-xl border border-red-300/40 bg-red-500/20 px-4 py-3 text-center text-xs text-red-100 mt-2">
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped>
.google-login-btn {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.google-login-btn:hover {
  background-color: rgba(255, 255, 255, 0.2) !important;
  border-color: rgba(255, 255, 255, 0.4) !important;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.3);
}

.google-login-btn:active {
  transform: translateY(0);
  background-color: rgba(255, 255, 255, 0.15) !important;
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
