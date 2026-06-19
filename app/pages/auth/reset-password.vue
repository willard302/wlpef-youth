<script setup lang="ts">
import type { Database } from '~/types/database.types'
import AuthInputField from './components/AuthInputField.vue'
import AuthButton from './components/AuthButton.vue'

definePageMeta({
  layout: 'auth'
})

const router = useRouter()
const supabase = useSupabaseClient<Database>()

const formData = ref({
  password: '',
  confirmPassword: ''
})

const fields = [
  { 
    id: 'password', 
    icon: 'lock',
    type: 'password', 
    placeholder: '請輸入至少 6 位數密碼',
    autocomplete: 'new-password'
  },
  { 
    id: 'confirmPassword', 
    icon: 'lock',
    type: 'password', 
    placeholder: '請再次輸入新密碼',
    autocomplete: 'new-password'
  }
]

const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const handleResetPassword = async () => {
  // 基礎驗證
  if (!formData.value.password) {
    errorMessage.value = '請輸入新密碼'
    return
  }
  if (formData.value.password.length < 6) {
    errorMessage.value = '密碼長度至少需要 6 個字元'
    return
  }
  if (formData.value.password !== formData.value.confirmPassword) {
    errorMessage.value = '兩次輸入的密碼不相同'
    return
  }

  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser() 

    if (userError || !user ) {
      throw new Error('重設連結已失效或過期')
    }

    let destination = '/home'
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    
    if (profile?.role === 'admin') {
      destination = '/admin'
    }

    // 調用 Supabase API 更新當前登入用戶的密碼
    const { error: updateError } = await supabase.auth.updateUser({
      password: formData.value.password
    })

    if (updateError) throw updateError

    successMessage.value = '密碼重設成功！即將為您登入...'
    
    setTimeout(() => {
      router.push(destination)
    }, 2000)
  } catch (err: any) {
    console.error('Reset password error:', err)
    errorMessage.value = err.message || '重設密碼失敗，請稍後再試或重新申請連結'
  } finally {
    loading.value = false
  }
}
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
          v-for="field in fields"
          :key="field.id"
          v-model="formData[field.id as keyof typeof formData]"
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