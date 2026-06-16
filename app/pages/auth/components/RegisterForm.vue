<script setup lang="ts">
import type { RegisterFormData } from '~/types/auth'
import AuthInputField from './AuthInputField.vue'
import AuthButton from './AuthButton.vue'

const emit = defineEmits(['switchMode'])
const {
  isGoogleLoading,
  isSignupLoading,
  errorMessage,
  loginWithGoogle,
  signupWithEmail
} = useAuth()


const registerData = ref<RegisterFormData>({
  email: '',
  fullName: '',
  password: '',
  confirmPassword: ''
})

const fields = [
  {
    id: 'fullName',
    label: '姓名',
    icon: 'person',
    type: 'text',
    placeholder: '真實姓名 (必填)',
    autocomplete: 'name'
  },
  {
    id: 'email',
    label: 'Email',
    icon: 'mail',
    type: 'email',
    placeholder: 'Email (必填)',
    autocomplete: 'username'
  },
  {
    id: 'password',
    label: '密碼',
    icon: 'lock',
    type: 'password',
    placeholder: '設定密碼',
    autocomplete: 'new-password'
  },
  {
    id: 'confirmPassword',
    label: '確認密碼',
    icon: 'lock_reset',
    type: 'password',
    placeholder: '確認密碼',
    autocomplete: 'new-password'
  }
]

</script>

<template>
  <div class="flex flex-col gap-4 animate-fade-in">
    <AuthButton
      google
      :loading="isGoogleLoading"
      @click="loginWithGoogle"
    >
      使用 Google 快速註冊
    </AuthButton>

    <div class="flex items-center gap-4 py-2">
      <div class="h-px flex-1 bg-white/10"></div>
      <span class="text-[10px] text-white/30 uppercase tracking-widest font-bold">或使用 Email</span>
      <div class="h-px flex-1 bg-white/10"></div>
    </div>

    <form @submit.prevent="signupWithEmail(registerData)" class="flex flex-col gap-3">
      <AuthInputField
        v-for="field in fields"
        :key="field.id"
        v-model="registerData[field.id as keyof RegisterFormData]"
        :type="field.type"
        :icon="field.icon"
        :placeholder="field.placeholder"
        :autocomplete="field.autocomplete"
      />
      
      <AuthButton
        type="submit"
        variant="primary"
        :loading="isSignupLoading"
        class="!h-12 !rounded-xl mt-2"
      >
        立即註冊
      </AuthButton>

      <button
        type="button" 
        @click="emit('switchMode', 'login')" 
        class="text-xs text-white/80 hover:text-white mt-1"
      >已有帳號？返回登入</button>

      <div v-if="errorMessage" class="rounded-xl border border-red-300/40 bg-red-500/20 px-4 py-3 text-center text-xs text-red-100 mt-2">
        {{ errorMessage }}
      </div>
    </form>
  </div>
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
