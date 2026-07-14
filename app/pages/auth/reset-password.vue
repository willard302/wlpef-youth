<script setup lang="ts">
import AuthInputField from './components/AuthInputField.vue'
import AuthButton from './components/AuthButton.vue'
import { RESET_PASSWORD_FIELDS } from '~/config/auth'

definePageMeta({
  layout: 'auth'
})

const { 
  resetPassowrdFields, 
  loading, 
  errorMessage, 
  successMessage,
  handleResetPassword
} = useAuth()

</script>

<template>
  <div class="flex flex-col items-center justify-center flex-1 px-8 text-center">
    <div class="glass-card w-full max-w-sm p-10 space-y-6 text-left">
      
      <div class="space-y-2 text-center">
        <h1 class="text-white text-2xl font-bold tracking-tight">
          設置新密碼
        </h1>
        <p class="text-white/60 text-sm">
          請為您的帳號設定一個新的登入密碼
        </p>
      </div>

      <form @submit.prevent="handleResetPassword" class="space-y-4">
        <AuthInputField
          v-for="field in RESET_PASSWORD_FIELDS"
          :key="field.id"
          v-model="resetPassowrdFields[field.id as keyof typeof resetPassowrdFields]"
          :icon="field.icon"
          :type="field.type"
          :placeholder="field.placeholder"
          :autocomplete="field.autocomplete"
          :disabled="loading"
        />

        <p v-if="errorMessage" class="text-red-300 text-sm font-medium text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
          {{ errorMessage }}
        </p>

        <p v-if="successMessage" class="text-green-300 text-sm font-medium text-center bg-green-500/10 py-2 rounded-lg border border-green-500/20">
          {{ successMessage }}
        </p>

        <AuthButton
          type="submit"
          variant="glass"
          :loading="loading"
        >
          {{ loading ? '更新密碼中...' : '確認修改' }}
        </AuthButton>
      </form>

      <div class="pt-2 text-center">
        <NuxtLink 
          to="/auth" 
          class="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium transition-colors"
        >
          <span>取消並返回登入</span>
        </NuxtLink>
      </div>

    </div>
  </div>
</template>
