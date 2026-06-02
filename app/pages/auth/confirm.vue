<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const router = useRouter()
const route = useRoute()
const supabase = useSupabaseClient()

const loading = ref(true)
const errorMessage = ref('')
const successMessage = ref('')
const isRecovery = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const isSubmitting = ref(false)

const resolveAuthMode = () => {
  const hashParams = new URLSearchParams(route.hash.substring(1))
  const queryType = route.query.type as string | undefined
  const hashType = hashParams.get('type') || undefined

  return queryType || hashType || ''
}

const handleResetPassword = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!newPassword.value || newPassword.value.length < 6) {
    errorMessage.value = '新密碼至少需要 6 個字元'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = '兩次輸入的密碼不一致'
    return
  }

  try {
    isSubmitting.value = true

    const { error } = await supabase.auth.updateUser({
      password: newPassword.value
    })

    if (error) throw error

    successMessage.value = '密碼已更新，請重新登入。'

    setTimeout(() => {
      router.push('/auth/login')
    }, 1500)
  } catch (err: any) {
    console.error('Reset password error:', err)
    errorMessage.value = err.message || '更新密碼失敗'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  // Wait a bit to ensure the auth state is ready
  await new Promise((resolve) => setTimeout(resolve, 300))
  const hash = route.hash
  const error = route.query.error as string
  const errorDescription = route.query.error_description as string
  const authMode = resolveAuthMode()

  isRecovery.value = authMode === 'recovery'

  if (isRecovery.value) {
    loading.value = false
    return
  }

  // Handle OAuth or PKCE errors from the URL
  if (error) {
    errorMessage.value = errorDescription || '驗證過程中發生錯誤'
    loading.value = false
    setTimeout(() => {
      router.push('/auth/login')
    }, 3000)
    return
  }

  // Also check for error parameters in the hash (Supabase sometimes puts them there)
  const hashParams = new URLSearchParams(hash.substring(1))
  const oauthError = hashParams.get('error_description')
  if (oauthError) {
    errorMessage.value = decodeURIComponent(oauthError)
    loading.value = false
    setTimeout(() => {
      router.push('/auth/login')
    }, 3000)
    return
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) throw userError

    if (user) {
      // 嘗試自動合併同 Email 的重複帳號（例如先 Google 後密碼註冊）
      const { data: mergeData, error: mergeError } = await supabase.functions.invoke('merge-duplicate-account', {
        body: {}
      })
      if (mergeError) {
        console.warn('Auto merge skipped:', mergeError.message)
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile || !profile.department) {
        // Initialize profile if it doesn't exist
        if (!profile) {
          const metadata = user.user_metadata || {}
          await supabase
            .from('profiles')
            .insert({
              id: user.id,
              name: metadata.name || metadata.full_name || user.email?.split('@')[0] || 'User',
              avatar_url: metadata.avatar_url || null,
              role: 'member',
              points: 0
            })
        }
        
        successMessage.value = mergeData?.merged
          ? '帳號已整合完成！即將跳轉完善資料...'
          : '登入成功！即將跳轉完善資料...'
        loading.value = false
        setTimeout(() => {
          router.push('/auth/social-signup')
        }, 1500)
      } else {
        successMessage.value = mergeData?.merged
          ? '帳號已整合完成！即將跳轉首頁...'
          : '驗證成功！即將跳轉首頁...'
        loading.value = false
        setTimeout(() => {
          router.push('/home')
        }, 1500)
      }
    }
  } catch (err: any) {
    console.error('Confirmation error:', err)
    // If there's an error but we're already logged in, just redirect to home
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      router.push('/home')
    } else {
      errorMessage.value = err.message || '電子郵件確認時發生錯誤'
      loading.value = false
      setTimeout(async () => {
        await supabase.auth.signOut()
        router.push('/auth/login')
      }, 3000)
    }
  }
})
</script>

<template>
  <div class="relative flex h-screen w-full flex-col overflow-hidden bg-background-light font-display">
    <!-- Animated background elements -->
    <div class="absolute inset-0 z-0 overflow-hidden">
      <div
        class="h-full w-full bg-cover bg-center"
        style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAKLqnX9ZXB6k4S_M2OiUzo28rwbVbB4qgtt-CuoJnz7esDmG4EipwCVb159pJxmBEUzY0SIMcJffb8sBWx7x0cCktLUUeogL4l_7CKhM4tw-WrZapPYOiXOJ_wFK0XCHI8tjk2PkDynPSxN-hiE_8DwZJ0-k355BY8O0Jn4yeAvRUuQ6juPcePLPZzromKaH4sAy7R06qG24jk8u4mJDZr3UbyPmicNP-tofDjENIMKDtGvnRYe5SgAVTeEDieQCXIlvpG11VqryQ')"
      ></div>
      <div class="absolute inset-0 bg-gradient-to-tr from-primary/15 via-white/5 to-white/10"></div>
      <div class="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/15 blur-3xl animate-pulse"></div>
      <div class="absolute bottom-8 -right-28 h-80 w-80 rounded-full bg-white/20 blur-3xl animate-pulse" style="animation-delay: 1s"></div>
    </div>

    <!-- Content -->
    <div class="relative z-10 flex flex-col items-center justify-center h-full px-8 text-center">
      <div class="w-full max-w-sm glass-effect rounded-[2.5rem] p-10 shadow-2xl space-y-8 border border-white/20">
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
            {{ isRecovery ? '重設密碼' : '電子郵件確認' }}
          </h1>
          
          <div v-if="loading" class="space-y-4">
            <p class="text-white/70">正在驗證您的電子郵件...</p>
            <div class="w-full bg-white/10 h-1 rounded-full overflow-hidden">
              <div class="bg-white h-full animate-progress-bar"></div>
            </div>
          </div>

          <form v-else-if="isRecovery && !errorMessage && !successMessage" @submit.prevent="handleResetPassword" class="space-y-4 text-left">
            <div class="space-y-3">
              <label class="block text-sm font-medium text-white/80" for="new-password">新密碼</label>
              <input
                id="new-password"
                v-model="newPassword"
                type="password"
                autocomplete="new-password"
                placeholder="輸入新密碼"
                class="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/45 outline-none transition focus:border-white/35 focus:bg-white/15"
              />
            </div>

            <div class="space-y-3">
              <label class="block text-sm font-medium text-white/80" for="confirm-password">確認新密碼</label>
              <input
                id="confirm-password"
                v-model="confirmPassword"
                type="password"
                autocomplete="new-password"
                placeholder="再次輸入新密碼"
                class="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/45 outline-none transition focus:border-white/35 focus:bg-white/15"
              />
            </div>

            <button
              type="submit"
              :disabled="isSubmitting"
              class="w-full rounded-2xl bg-white px-5 py-3 font-bold text-primary transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ isSubmitting ? '更新中...' : '更新密碼' }}
            </button>
          </form>

          <p v-else-if="errorMessage" class="text-red-200 font-medium">
            {{ errorMessage }}
          </p>

          <p v-else-if="successMessage" class="text-green-200 font-medium">
            {{ successMessage }}
          </p>
        </div>

        <div class="pt-4">
          <NuxtLink 
            to="/auth/login" 
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
  </div>
</template>

<style scoped>
.confirm-panel {
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.status-orbit {
  position: relative;
  border-radius: 9999px;
  filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.6));
}

.status-orbit::before,
.status-orbit::after {
  content: '';
  position: absolute;
  border-radius: inherit;
  pointer-events: none;
}

.status-orbit::before {
  inset: 0;
  border: 6px solid #ba1a1a;
}

.status-orbit::after {
  inset: 8px;
  border: 6px solid #ffb869;
}

.confirm-panel h1 {
  font-weight: 800;
  letter-spacing: 0.16em;
  text-shadow: 0 2px 16px rgba(16, 26, 34, 0.25);
}

.confirm-panel p {
  text-shadow: 0 2px 14px rgba(16, 26, 34, 0.22);
}

.confirm-panel a {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.75rem 1.25rem;
  letter-spacing: 0.05em;
}

.floating {
  animation: floating 6s ease-in-out infinite;
}

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

@keyframes floating {
  0% { transform: translateY(0); }
  50% { transform: translateY(-14px); }
  100% { transform: translateY(0); }
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
