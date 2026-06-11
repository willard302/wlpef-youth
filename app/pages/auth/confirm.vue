<script setup lang="ts">
import type { Database } from '@/types/database.types'

definePageMeta({
  layout: 'auth'
})

const router = useRouter()
const route = useRoute()
const supabase = useSupabaseClient<Database>()

const loading = ref(true)
const errorMessage = ref('')
const successMessage = ref('')

const resolveDestination = async (userId: string): Promise<'/admin' | '/home'> => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  return profile?.role === 'admin' ? '/admin' : '/home'
}

const redirectWithSuccess = (message: string, path: '/admin' | '/home') => {
  successMessage.value = message
  loading.value = false
  setTimeout(() => {
    router.push(path)
  }, 1500)
}

onMounted(async () => {
  // Wait a bit to ensure the auth state is ready
  await new Promise((resolve) => setTimeout(resolve, 500))
  
  const { clearUserData } = useUser()
  clearUserData()
  
  const hash = route.hash
  const error = route.query.error as string
  const errorDescription = route.query.error_description as string

  const hashParams = new URLSearchParams(hash.substring(1))
  const queryType = route.query.type as string | undefined
  const hashType = hashParams.get('type') || undefined

  if (queryType === 'recovery' || hashType === 'recovery') {
    errorMessage.value = '重設密碼功能已停用，請改用 Google 登入。'
    loading.value = false
    setTimeout(() => {
      router.push('/auth')
    }, 2000)
    return
  }

  // Handle OAuth or PKCE errors from the URL
  if (error) {
    errorMessage.value = errorDescription || '驗證過程中發生錯誤'
    loading.value = false
    setTimeout(() => {
      router.push('/auth')
    }, 3000)
    return
  }

  // Also check for error parameters in the hash (Supabase sometimes puts them there)
  const oauthError = hashParams.get('error_description')
  if (oauthError) {
    errorMessage.value = decodeURIComponent(oauthError)
    loading.value = false
    setTimeout(() => {
      router.push('/auth')
    }, 3000)
    return
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError

    if (!user?.id) {
      errorMessage.value = '登入狀態已失效，請重新登入。'
      loading.value = false
      setTimeout(() => {
        router.push('/auth')
      }, 1200)
      return
    }

    // 嘗試自動合併同 Email 的重複帳號（例如先 Google 後密碼註冊）
    const { data: mergeData, error: mergeError } = await supabase.functions.invoke('merge-duplicate-account', {
      body: {}
    })
    if (mergeError) {
      console.warn('Auto merge skipped:', mergeError.message)
    }

    const destination = await resolveDestination(user.id)

    redirectWithSuccess(
      mergeData?.merged
        ? '帳號已整合完成！即將跳轉中...'
        : '驗證成功！即將跳轉中...',
      destination
    )
  } catch (err: any) {
    console.error('Confirmation error:', err)
    // If there's an error but we're already logged in, just redirect to home
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: { user: sessionUser } } = await supabase.auth.getUser()
      if (sessionUser?.id) {
        const destination = await resolveDestination(sessionUser.id)
        router.push(destination)
      } else {
        router.push('/home')
      }
    } else {
      errorMessage.value = err.message || '電子郵件確認時發生錯誤'
      loading.value = false
      setTimeout(async () => {
        await supabase.auth.signOut()
        router.push('/auth')
      }, 3000)
    }
  }
})
</script>

<template>
  <div class="flex flex-col items-center justify-center flex-1 px-8 text-center">
    <div class="w-full max-w-sm glass-effect rounded-[2.5rem] p-10 shadow-2xl space-y-8 border border-white/20 bg-white/10 backdrop-blur-xl">
      <div class="size-24 rounded-3xl flex items-center justify-center mx-auto text-primary">
        <span v-if="loading" class="status-spinner" aria-label="載入中"></span>
        <svg
          v-else-if="errorMessage"
          class="size-14 text-red-500"
          viewBox="0 0 24 24"
          fill="none"
          aria-label="錯誤"
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.25" />
          <path d="M12 7.5v5.25" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" />
          <circle cx="12" cy="16.5" r="1.2" fill="currentColor" />
        </svg>
        <svg
          v-else
          class="size-14 text-green-500"
          viewBox="0 0 24 24"
          fill="none"
          aria-label="成功"
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.25" />
          <path d="m8 12.25 2.55 2.55L16.5 8.85" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>

      <div class="space-y-3">
        <h1 class="text-white text-2xl font-bold tracking-tight">
          電子郵件確認
        </h1>
        
        <div v-if="loading" class="space-y-4">
          <p class="text-white/70">正在驗證您的電子郵件...</p>
          <div class="w-full bg-white/10 h-1 rounded-full overflow-hidden">
            <div class="bg-white h-full animate-progress-bar"></div>
          </div>
        </div>

        <p v-else-if="errorMessage" class="text-red-200 font-medium">
          {{ errorMessage }}
        </p>

        <p v-else-if="successMessage" class="text-green-200 font-medium">
          {{ successMessage }}
        </p>
      </div>

      <div class="pt-4">
        <NuxtLink 
          to="/auth" 
          class="inline-flex items-center gap-2 text-white/60 hover:text-white font-bold transition-colors"
        >
          <svg class="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5m0 0 6-6m-6 6 6 6" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>返回登入</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-spinner {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 9999px;
  border: 4px solid rgba(43, 157, 238, 0.22);
  border-top-color: #2b9dee;
  box-shadow: 0 0 24px rgba(255, 255, 255, 0.45);
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes progress-bar {
  0% { width: 0%; transform: translateX(-100%); }
  50% { width: 70%; transform: translateX(0); }
  100% { width: 100%; transform: translateX(100%); }
}

.animate-progress-bar {
  width: 100%;
  animation: progress-bar 2s infinite ease-in-out;
}
</style>
