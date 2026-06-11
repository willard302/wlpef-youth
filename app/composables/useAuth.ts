import type { Database } from "~/types/database.types"
import type { LoginFormData, RegisterFormData } from "~/types/auth"

export const useAuth = () => {
  
  const supabase = useSupabaseClient<Database>()
  const router = useRouter()

  const loading = ref(false)
  const errorMessage = ref('')

  const handleAuthError = (error: any, fallbackMessage: string) => {
    console.error('Auth Error:', error)
    const msg = error?.message || ''

    if (msg.includes('provider is not enabled')) {
      errorMessage.value = '該登入方式（如 Google）尚未啟用，請聯絡管理員。'
    } else if (msg.includes('Invalid login credentials')) {
      errorMessage.value = '登入失敗，請檢查您的帳號密碼。'
    } else if (error?.code === '22023' && msg.includes('role')) {
      errorMessage.value = '帳號角色設定異常，請先登出後重新登入；若仍失敗請聯絡管理員。'
    } else {
      errorMessage.value = error.message || fallbackMessage
    }
  }

  const loginWithGoogle = async () => {
    try {
      loading.value = true
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
    }
  }

  const loginWithEmail = async (formData: LoginFormData) => {
    if (!formData.email || !formData.password) {
      errorMessage.value = '請輸入 Email 與密碼'
      return
    }

    try {
      loading.value = true
      errorMessage.value = ''

      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })
      if (error) throw error

      router.push('/home')
    } catch (error) {
      handleAuthError(error, '登入失敗，請檢查您的帳號密碼。')
    } finally {
      loading.value = false
    }
  }

  const signupWithEmail = async (registerData: RegisterFormData) => {
    if (!registerData.email || !registerData.password || !registerData.fullName) {
      errorMessage.value = '請填寫所有欄位'
      return
    }

    if (registerData.password !== registerData.confirmPassword) {
      errorMessage.value = '兩次輸入的密碼不一樣'
    }

    try {
      loading.value = true
      errorMessage.value = ''

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
        errorMessage.value = '註冊成功！請前往您的 Email 以驗證帳號。'
      } else if (data.session) {
        router.push('/home')
      }
    } catch (error) {
      handleAuthError(error, '註冊失敗')
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    errorMessage,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    handleAuthError
  }
}
