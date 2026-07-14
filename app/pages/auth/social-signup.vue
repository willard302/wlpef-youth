<script setup lang="ts">
import AuthInputField from './components/AuthInputField.vue'
import AuthButton from './components/AuthButton.vue'
import { SOCIAL_SIGNUP_FIELDS } from '~/config/auth.js'

definePageMeta({
  layout: 'auth'
})

const { handleCompleteRegistration, fetchUserData, initializing, socialSignupFields, loading, errorMessage } = useAuth()

onMounted(() => {
  fetchUserData()
})
</script>

<template>
  <div class="flex flex-col items-center justify-center flex-1 px-6 py-10 sm:py-14">
    <div class="glass-card w-full max-w-sm p-7 space-y-8">
      
      <!-- Header -->
      <div class="text-center space-y-4">
        <div class="flex flex-col items-center gap-4">
          <LogoIcon size="md" />
          <h1 class="text-white text-2xl font-bold tracking-widest drop-shadow-md">完成註冊</h1>
        </div>
        <p class="text-white/80 text-sm leading-relaxed">請確認並填寫以下資訊以完成您的帳號設定。</p>
      </div>

      <!-- Initializing State -->
      <div v-if="initializing" class="py-12 flex flex-col items-center justify-center gap-4">
        <van-loading type="spinner" size="24px" color="#ffffff" />
        <p class="text-white/60 font-medium text-sm tracking-widest">正在載入...</p>
      </div>

      <!-- Form Section -->
      <div v-else class="flex flex-col gap-6">
        <div class="space-y-4">
          <div
            v-for="field in SOCIAL_SIGNUP_FIELDS"
            :key="field.key"
            class="space-y-2"
          >
            <AuthInputField
              v-model="socialSignupFields[field.key]"
              :label="field.label"
              :icon="field.icon"
              :type="field.type"
              :placeholder="field.placeholder"
              :disabled="field.key === 'email' && !!socialSignupFields.email"
            />
            <p v-if="field.helperText" class="text-white/40 text-[11px] leading-relaxed pl-1">{{ field.helperText }}</p>
          </div>
        </div>

        <!-- Error Message -->
        <transition name="fade">
          <div v-if="errorMessage" class="rounded-xl border border-red-300/40 bg-red-500/20 px-4 py-3 text-center text-xs text-red-100">
            {{ errorMessage }}
          </div>
        </transition>

        <!-- Submit Button -->
        <AuthButton
          @click="handleCompleteRegistration"
          variant="primary"
          :loading="loading"
          icon="done_all"
        >
          完成註冊
        </AuthButton>
      </div>
    </div>

    <!-- Footer Branding -->
    <p class="text-center text-[10px] text-white/40 mt-8">領袖會社青團官方平台</p>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
