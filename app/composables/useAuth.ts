import { userService } from "~/services/user"
import type { Database, LoginFormData, RegisterFormData } from "~/types"
import { getRoleDestination } from "~/utils/auth"

export const useAuth = () => {
  
  const supabase = useSupabaseClient<Database>()
  const router = useRouter()
  const route = useRoute()
  const { loadUserData, clearUserData } = useUser()

  const loading = ref(false)
  const isGoogleLoading = ref(false)
  const isEmailLoading = ref(false)
  const isSignupLoading = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')
  const confirmLoading = ref(true)
  const confirmErrorMessage = ref('')
  const confirmSuccessMessage = ref('')
  const showMoreOptions = ref(false)
  let confirmRedirectTimer: ReturnType<typeof setTimeout> | null = null
  let confirmSignOutTimer: ReturnType<typeof setTimeout> | null = null
  const loginField = ref<LoginFormData>({
    email: '',
    password: ''
  })
  const registerFields = ref<RegisterFormData>({
    email: '',
    fullName: '',
    password: '',
    confirmPassword: ''
  })
  const resetPassowrdFields = ref({
    password: '',
    confirmPassword: ''
  })

  const redirectUserByRole = async() => {
    try {
      const profile = await userService.fetchUserProfile()
      const dest = getRoleDestination(profile?.role)
      await loadUserData(true)
      return router.push(dest)
    } catch (error) {
      handleAuthError(error, '登入失敗，請重新登入')
    }
  }

  const googleLoginLock = useAsyncLock(async () => {
    try {
      loading.value = true
      isGoogleLoading.value = true
      errorMessage.value = ''

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/confirm`
        }
      })
      if (error) throw error
    } catch (error) {
      handleAuthError(error, 'Google 登入時發生錯誤。')
      loading.value = false
      isGoogleLoading.value = false
    }
  })

  const emailLoginLock = useAsyncLock(async (formData: LoginFormData) => {
    try {
      loading.value = true
      isEmailLoading.value = true
      errorMessage.value = ''

      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })
      if (error) throw error

      await redirectUserByRole()
    } catch (error) {
      handleAuthError(error, '登入失敗，請檢查您的帳號密碼。')
    } finally {
      loading.value = false
      isEmailLoading.value = false
    }
  })

  const signupLock = useAsyncLock(async (registerData: RegisterFormData) => {
    try {
      loading.value = true
      isSignupLoading.value = true
      errorMessage.value = ''

      const { data: registrationData, error: registrationError } = await supabase.functions.invoke(
        'check-user-registration',
        {
          body: {
            email: registerData.email.trim()
          }
        }
      )

      if (registrationError) throw registrationError

      if (registrationData?.exists) {
        const isGoogleLogin = registrationData.providers?.includes('google')
        throw isGoogleLogin ? '該 Email 已註冊，請直接透過Google登入' : '該 Email 已註冊，請直接登入'
      }

      const { data, error } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: {
          data: {
            name: registerData.fullName
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm`
        }
      })
      if (error) throw error

      if (data.user && !data.session) {
        await router.push({
          path: '/auth/success',
          query: { email: registerData.email }
        })
      } else if (data.session) {
        await redirectUserByRole()
      }
    } catch (error) {
      handleAuthError(error, '註冊失敗')
    } finally {
      loading.value = false
      isSignupLoading.value = false
    }
  })

  const loginWithGoogle = async () => googleLoginLock.run()

  const loginWithEmail = async (formData: LoginFormData) => {
    if (!formData.email.trim() || !formData.password) {
      errorMessage.value = '請輸入 Email 與密碼'
      return
    }

    return emailLoginLock.run(formData)
  }

  const signupWithEmail = async (registerData: RegisterFormData) => {
    if (!registerData.email?.trim() || !registerData.password || !registerData.fullName?.trim()) {
      errorMessage.value = '請填寫所有欄位'
      return
    }

    if (registerData.password !== registerData.confirmPassword) {
      errorMessage.value = '兩次輸入的密碼不一樣'
      return
    }

    return signupLock.run(registerData)
  }

  const handleAuthError = (error: unknown, fallbackMessage: string) => {
    console.error('Auth Error:', error)

    if (typeof error === 'string') {
      errorMessage.value = error
      return
    }

    if (!(error instanceof Error)) {
      errorMessage.value = fallbackMessage
      return
    }

    const msg = error.message

    if (msg.includes('provider is not enabled')) {
      errorMessage.value = '該登入方式（如 Google）尚未啟用，請聯絡管理員。'
    } else if (msg.includes('Invalid login credentials')) {
      errorMessage.value = '登入失敗，請檢查您的帳號密碼。'
    } else if (msg.includes('User already registered')) {
      errorMessage.value = '該 Email 已經被註冊，請直接登入'
    } else if (msg.includes('Password should be')) {
      errorMessage.value = '密碼強度不足或不符合伺服器規範'
    } else if ((error as any)?.code === '22023' && msg.includes('role')) {
      errorMessage.value = '帳號角色設定異常，請先登出後重新登入；若仍失敗請聯絡管理員'
    } else {
      errorMessage.value = msg || fallbackMessage
    }
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const clearConfirmRedirectState = () => {
      if (confirmRedirectTimer) {
        clearTimeout(confirmRedirectTimer)
        confirmRedirectTimer = null
      }
      if (confirmSignOutTimer) {
        clearTimeout(confirmSignOutTimer)
        confirmSignOutTimer = null
      }
      confirmErrorMessage.value = ''
      confirmSuccessMessage.value = ''
      confirmLoading.value = true
  }

  const redirectWithConfirmDelay = (path: '/auth' | '/auth/reset-password' | '/admin' | '/home', delay = 1500) => {
    confirmRedirectTimer = setTimeout(() => {
      router.push(path)
    }, delay)
  }

  const handleResetPassword = () => resetPasswordLock.run()

  const resolveDestination = async (userId: string): Promise<'/admin' | '/home'> => {
    const profile = await userService.fetchUserRole(userId)
    return getRoleDestination(profile?.role)
  }

  const handleConfirmAuth = async () => {
    clearUserData()
    clearConfirmRedirectState()

    // 給 Supabase 足夠時間解析 hash 中的 access token / refresh token
    await sleep(800)

    const hash = route.hash
    const error = typeof route.query.error === 'string' ? route.query.error : ''
    const errorDescription = typeof route.query.error_description === 'string' ? route.query.error_description : ''
    const hashParams = new URLSearchParams(hash.substring(1))
    const queryType = typeof route.query.type === 'string' ? route.query.type : undefined
    const hashType = hashParams.get('type') || undefined

    const { data: { session } } = await supabase.auth.getSession()

    if (queryType === 'recovery' || hashType === 'recovery' || queryType === 'invite' || hashType === 'invite') {
      if (!session && hashParams.get('access_token')) {
        const accessToken = hashParams.get('access_token')!
        const refreshToken = hashParams.get('refresh_token')!
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
      }

      confirmSuccessMessage.value = '驗證成功，正在建立安全連線...'
      confirmLoading.value = false
      redirectWithConfirmDelay('/auth/reset-password')
      return
    }

    if (error) {
      confirmErrorMessage.value = errorDescription || '驗證過程中發生錯誤'
      confirmLoading.value = false
      redirectWithConfirmDelay('/auth', 3000)
      return
    }

    const oauthError = hashParams.get('error_description')
    if (oauthError) {
      confirmErrorMessage.value = decodeURIComponent(oauthError)
      confirmLoading.value = false
      redirectWithConfirmDelay('/auth', 3000)
      return
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      if (!user?.id) {
        confirmErrorMessage.value = '登入狀態已失效，請重新登入。'
        confirmLoading.value = false
        redirectWithConfirmDelay('/auth', 1200)
        return
      }

      const { data: mergeData, error: mergeError } = await supabase.functions.invoke('merge-duplicate-account', {
        body: {}
      })
      if (mergeError) {
        console.warn('Auto merge skipped:', mergeError.message)
      }

      const destination = await resolveDestination(user.id)

      confirmSuccessMessage.value = mergeData?.merged ? '帳號已整合完成！即將跳轉中...' : '驗證成功！即將跳轉中...'
      confirmLoading.value = false
      redirectWithConfirmDelay(destination)
    } catch (err: any) {
      console.error('Confirmation error:', err)

      if (session) {
        const { data: { user: sessionUser } } = await supabase.auth.getUser()
        if (sessionUser?.id) {
          const destination = await resolveDestination(sessionUser.id)
          router.push(destination)
        } else {
          router.push('/home')
        }
        return
      }

      confirmErrorMessage.value = err.message || '電子郵件確認時發生錯誤'
      confirmLoading.value = false
      confirmSignOutTimer = setTimeout(async () => {
        await supabase.auth.signOut()
        router.push('/auth')
      }, 3000)
    }
  }

  const resetPasswordLock = useAsyncLock(async () => {
    // 基礎驗證
    if (!resetPassowrdFields.value.password) {
      errorMessage.value = '請輸入新密碼'
      return
    }
    if (resetPassowrdFields.value.password.length < 6) {
      errorMessage.value = '密碼長度至少需要 6 個字元'
      return
    }
    if (resetPassowrdFields.value.password !== resetPassowrdFields.value.confirmPassword) {
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

      destination = getRoleDestination(profile?.role)

      // 調用 Supabase API 更新當前登入用戶的密碼
      const { error: updateError } = await supabase.auth.updateUser({
        password: resetPassowrdFields.value.password
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
  })

  onUnmounted(() => {
    clearConfirmRedirectState()
  })

  return {
    loginField,
    registerFields,
    resetPassowrdFields,
    loading,
    isGoogleLoading,
    isEmailLoading,
    isSignupLoading,
    errorMessage,
    successMessage,
    showMoreOptions,
    confirmLoading,
    confirmErrorMessage,
    confirmSuccessMessage,
    resetPasswordLock,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    handleAuthError,
    handleConfirmAuth,
    handleResetPassword,
    redirectWithConfirmDelay,
    clearConfirmRedirectState
  }
}
