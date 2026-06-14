<script setup lang="ts">
import type { RegisterFormData } from '~/types/auth'
import AuthInputField from './AuthInputField.vue'

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
  <form @submit.prevent="signupWithEmail(registerData)" class="flex flex-col gap-3 animate-fade-in">
    <AuthInputField
      v-for="field in fields"
      :key="field.id"
      v-model="registerData[field.id as keyof RegisterFormData]"
      :type="field.type"
      :icon="field.icon"
      :placeholder="field.placeholder"
      :autocomplete="field.autocomplete"
    />
    
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
