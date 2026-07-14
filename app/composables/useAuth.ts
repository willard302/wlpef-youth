import { userService } from "~/services/user"
import type { Database, LoginFormData, RegisterFormData } from "~/types"
import { getRoleDestination } from "~/utils/auth"

export const useAuth = () => {
  
  const supabase = useSupabaseClient<Database>()
  const router = useRouter()
  const { loadUserData } = useUser()

  const loading = ref(false)
  const isGoogleLoading = ref(false)
  const isEmailLoading = ref(false)
  const isSignupLoading = ref(false)
  const errorMessage = ref('')
  const showMoreOptions = ref(false)
  const formData = ref<LoginFormData>({
    email: '',
    password: ''
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

  return {
    formData,
    loading,
    isGoogleLoading,
    isEmailLoading,
    isSignupLoading,
    errorMessage,
    showMoreOptions,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    handleAuthError
  }
}
