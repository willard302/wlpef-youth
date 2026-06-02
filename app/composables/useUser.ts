import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { userService } from '@/services/userService'
import type { UserProfile, Activity, Role } from '@/types'

/**
 * Logic Layer: 使用者的業務邏輯與狀態管理
 */
export function useUser() {
  const router = useRouter()
  const supabase = useSupabaseClient()

  // 狀態 (State)
  const userProfile = ref<UserProfile | null>(null)
  const recentActivities = ref<Activity[]>([])
  const isLoading = ref(false)
  const isUploadingAvatar = ref(false)
  const isUpdatingProfile = ref(false)
  const isChangingPassword = ref(false)
  const error = ref<string | null>(null)

  // 動作 (Actions)
  const loadUserData = async () => {
    isLoading.value = true
    error.value = null
    try {
      // 呼叫 Data Layer
      const [profileData, activitiesData] = await Promise.all([
        userService.fetchUserProfile(),
        userService.fetchRecentActivities()
      ])

      userProfile.value = profileData
      recentActivities.value = activitiesData
    } catch (err: any) {
      error.value = err.message || '載入用戶資料失敗'
      console.error(err)
      router.push('/auth/login')
    } finally {
      isLoading.value = false
    }
  }

  const uploadAvatar = async (file: File) => {
    if (!userProfile.value) return

    isUploadingAvatar.value = true
    error.value = null

    try {
      // 上傳新大頭照
      const avatarUrl = await userService.uploadAvatar(file, supabase)

      // 更新本地狀態
      userProfile.value.avatar = avatarUrl

      // 重新載入用戶資料確保資料一致性
      await loadUserData()
    } catch (err: any) {
      error.value = err.message || '上傳大頭照失敗'
      console.error(err)
      throw err
    } finally {
      isUploadingAvatar.value = false
    }
  }

  /**
   * 更新使用者的個人資訊
   */
  const updateUserProfile = async (
    profileData: {
      name?: string
      points?: number
      role?: string
      department?: string
      phoneNumber?: string
      gender?: string
      bio?: string
    }
  ) => {
    if (!userProfile.value) return

    isUpdatingProfile.value = true
    error.value = null

    try {
      // 呼叫 userService 更新資料 (包含 profiles 表與 auth metadata)
      await userService.updateUserProfile(supabase, profileData)

      // 重新載入用戶資料確保資料一致性
      await loadUserData()
    } catch (err: any) {
      error.value = err.message || '更新個人資料失敗'
      console.error(err)
      throw err
    } finally {
      isUpdatingProfile.value = false
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (err) {
      console.error('Logout error:', err)
      router.push('/auth/login')
    }
  }

  /**
   * 修改密碼
   */
  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    error.value = null

    if (newPassword !== confirmPassword) {
      error.value = '新密碼和確認密碼不相符'
      throw new Error(error.value)
    }

    if (currentPassword === newPassword) {
      error.value = '新密碼不能與當前密碼相同'
      throw new Error(error.value)
    }

    isChangingPassword.value = true

    try {
      await userService.changePassword(currentPassword, newPassword)
    } catch (err: any) {
      error.value = err.message || '修改密碼失敗'
      console.error(err)
      throw err
    } finally {
      isChangingPassword.value = false
    }
  }

  /**
   * 完成社群 OAuth 用戶註冊
   */
  const completeSocialSignup = async (socialSignupData: {
    fullName: string
    points: number
    department: string
    phoneNumber?: string
    gender?: string
    bio?: string
  }) => {
    isUpdatingProfile.value = true
    error.value = null

    try {
      // 更新用戶個人資料
      await userService.updateUserProfile(supabase, {
        name: socialSignupData.fullName,
        points: socialSignupData.points,
        department: socialSignupData.department,
        phoneNumber: socialSignupData.phoneNumber,
        gender: socialSignupData.gender,
        bio: socialSignupData.bio
      })

      // 標記社群登入首次資料補填已完成
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      await supabase.auth.updateUser({
        data: {
          ...(user.user_metadata || {}),
          social_signup_completed: true,
          google_signup_completed: true
        }
      })

      // 重新載入用戶資料
      await loadUserData()
    } catch (err: any) {
      error.value = err.message || '完成註冊失敗'
      console.error(err)
      throw err
    } finally {
      isUpdatingProfile.value = false
    }
  }

  return {
    userProfile,
    recentActivities,
    isLoading,
    isUploadingAvatar,
    isUpdatingProfile,
    isChangingPassword,
    error,
    loadUserData,
    uploadAvatar,
    updateUserProfile,
    changePassword,
    completeSocialSignup,
    handleLogout
  }
}
