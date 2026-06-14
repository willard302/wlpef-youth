<script setup lang="ts">
import type { LoginFormData } from '~/types/auth'
import AuthInputField from './AuthInputField.vue'
import AuthButton from './AuthButton.vue'

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
    <AuthButton
      google
      :loading="loading"
      @click="loginWithGoogle"
    >
      使用 Google 登入
    </AuthButton>

    <div class="text-center">
      <button 
        v-if="!showMoreOptions"
        @click="showMoreOptions = true"
        class="text-xs text-white/60 hover:text-white transition-colors underline decoration-white/30"
      >
        顯示更多登入方式
      </button>
    </div>

    <div v-if="showMoreOptions" class="flex items-center gap-4 py-2 animate-fade-in">
      <div class="h-px flex-1 bg-white/10"></div>
      <span class="text-[10px] text-white/30 uppercase tracking-widest font-bold">或使用 Email</span>
      <div class="h-px flex-1 bg-white/10"></div>
    </div>

    <form v-if="showMoreOptions" @submit.prevent="loginWithEmail(formData)" class="flex flex-col gap-3 animate-fade-in">
      <AuthInputField
        v-for="field in fields"
        :key="field.id"
        v-model="formData[field.id as keyof LoginFormData]"
        :type="field.type"
        :icon="field.icon"
        :placeholder="field.placeholder"
        :autocomplete="field.autocomplete"
      />
      <AuthButton
        type="submit"
        variant="primary"
        :loading="loading"
        class="!h-12 !rounded-xl mt-1"
      >
        登入
      </AuthButton>
      
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
.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
