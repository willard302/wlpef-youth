<script setup lang="ts">
import type { Database } from '@/types/database.types'

definePageMeta({
  layout: 'auth'
})

const router = useRouter()
const supabase = useSupabaseClient<Database>()

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const handleResetPassword = async () => {
  // 基礎驗證
  if (!password.value) {
    errorMessage.value = '請輸入新密碼'
    return
  }
  if (password.value.length < 6) {
    errorMessage.value = '密碼長度至少需要 6 個字元'
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = '兩次輸入的密碼不相同'
    return
  }

  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    // 調用 Supabase API 更新當前登入用戶的密碼
    const { error } = await supabase.auth.updateUser({
      password: password.value
    })

    if (error) throw error

    successMessage.value = '密碼重設成功！即將為您登入...'
    
    // 檢查用戶角色以決定跳轉去哪裡
    const { data: { user } } = await supabase.auth.getUser()
    let destination = '/home'
    
    if (user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
        
      if (profile?.role === 'admin') {
        destination = '/admin'
      }
    }

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
    <div class="w-full max-w-sm glass-effect rounded-[2.5rem] p-10 shadow-2xl space-y-6 border border-white/20 bg-white/10 backdrop-blur-xl text-left">
      
      <div class="space-y-2 text-center">
        <h1 class="text-white text-2xl font-bold tracking-tight">
          設置新密碼
        </h1>
        <p class="text-white/60 text-sm">
          請為您的帳號設定一個新的登入密碼
        </p>
      </div>

      <form @submit.prevent="handleResetPassword" class="space-y-4">
        <div class="space-y-1">
          <label class="text-white/80 text-sm font-medium pl-1">新密碼</label>
          <input 
            v-model="password"
            type="password" 
            placeholder="請輸入至少 6 位數密碼"
            class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/50 transition-colors"
            :disabled="loading"
            autocomplete="new-password"
          />
        </div>

        <div class="space-y-1">
          <label class="text-white/80 text-sm font-medium pl-1">確認新密碼</label>
          <input 
            v-model="confirmPassword"
            type="password" 
            placeholder="請再次輸入新密碼"
            class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/50 transition-colors"
            :disabled="loading"
            autocomplete="new-password"
          />
        </div>

        <p v-if="errorMessage" class="text-red-300 text-sm font-medium text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">
          {{ errorMessage }}
        </p>
        <p v-if="successMessage" class="text-green-300 text-sm font-medium text-center bg-green-500/10 py-2 rounded-lg border border-green-500/20">
          {{ successMessage }}
        </p>

        <button 
          type="submit"
          :disabled="loading"
          class="w-full py-3 bg-white text-gray-900 font-bold rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
        >
          <van-loading v-if="loading" type="spinner" size="20px" color="#111827" />
          <span>{{ loading ? '更新密碼中...' : '確認修改' }}</span>
        </button>
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