import { userService } from '@/services/userService'
import type { UserProfile, Activity } from '@/types'
import type { Database } from '@/types/database.types'

/**
 * Logic Layer: 使用者的業務邏輯與狀態管理
 */
export function useUser() {
  const router = useRouter()
  const supabase = useSupabaseClient<Database>()

  // 全域狀態 (Global State)
  const userProfile = useState<UserProfile | null>('user-profile', () => null)
  const recentActivities = useState<Activity[]>('recent-activities', () => [])
  const isLoading = useState('user-loading', () => false)
  const isUploadingAvatar = useState('user-avatar-loading', () => false)
  const isUpdatingProfile = useState('user-updating', () => false)
  const error = useState<string | null>('user-error', () => null)
  const loadingPromise = useState<Promise<void> | null>('user-loading-promise', () => null)

  const profileSubscription = useState<any>('user-profile-subscription', () => null)

  // 動作 (Actions)
  const setupProfileListener = async () => {
    // 如果已經有監聽器，就不再建立
    if (profileSubscription.value) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const channel = supabase
      .channel(`profile-updates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          if (userProfile.value) {
            // 將資料庫的 snake_case 映射回 UserProfile 的 camelCase
            userProfile.value = {
              ...userProfile.value,
              points: payload.new.points ?? userProfile.value.points,
              name: payload.new.name ?? userProfile.value.name,
              avatar: payload.new.avatar_url ?? userProfile.value.avatar,
              role: payload.new.role ?? userProfile.value.role,
              scanPermission: payload.new.scan_permission ?? userProfile.value.scanPermission
            }
          }
        }
      )
      .subscribe()
    
    profileSubscription.value = channel
  }

  const loadUserData = async (force = false) => {
    // 如果已經有資料且不是強制更新，則跳過
    if (userProfile.value && !force) {
      setupProfileListener() // 確保監聽器有啟動
      return
    }

    // 若已有進行中的請求，等待既有請求完成，避免重複打 API
    if (loadingPromise.value && !force) {
      await loadingPromise.value
      return
    }

    const request = (async () => {
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
        
        // 成功載入後啟動監聽器
        setupProfileListener()
      } catch (err: any) {
        error.value = err.message || '載入用戶資料失敗'
        console.error(err)
        // 只有在真的沒權限時才跳轉
        if (err.message === 'User not authenticated') {
          router.push('/auth')
        }
      } finally {
        isLoading.value = false
      }
    })()

    loadingPromise.value = request
    try {
      await request
    } finally {
      loadingPromise.value = null
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
      await loadUserData(true)
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
      email: string
      name?: string
      points?: number
      role?: string
      scanPermission?: boolean
    }
  ) => {
    if (!userProfile.value) return

    isUpdatingProfile.value = true
    error.value = null

    try {
      // 呼叫 userService 更新資料 (包含 profiles 表與 auth metadata)
      await userService.updateUserProfile(supabase, profileData)

      // 重新載入用戶資料確保資料一致性
      await loadUserData(true)
    } catch (err: any) {
      error.value = err.message || '更新個人資料失敗'
      console.error(err)
      throw err
    } finally {
      isUpdatingProfile.value = false
    }
  }

  const clearUserData = () => {
    // 清除監聽器
    if (profileSubscription.value) {
      supabase.removeChannel(profileSubscription.value)
      profileSubscription.value = null
    }
    userProfile.value = null
    recentActivities.value = []
    error.value = null
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      clearUserData()
      router.push('/auth')
    } catch (err) {
      console.error('Logout error:', err)
      clearUserData()
      router.push('/auth')
    }
  }

  /**
   * 重置帳號
   */
  const handleResetAccount = async () => {
    try {
      isLoading.value = true
      await userService.resetUserAccount()
      clearUserData()
      router.push('/auth')
    } catch (err: any) {
      console.error('Reset account error:', err)
      error.value = err.message || '重置帳號失敗'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 完成社群 OAuth 用戶註冊
   */
  const completeSocialSignup = async (socialSignupData: {
    fullName: string
    points: number
  }) => {
    isUpdatingProfile.value = true
    error.value = null

    try {
      // 更新用戶個人資料
      await userService.updateUserProfile(supabase, {
        name: socialSignupData.fullName,
        points: socialSignupData.points
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
      await loadUserData(true)
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
    error,
    loadUserData,
    clearUserData,
    uploadAvatar,
    updateUserProfile,
    completeSocialSignup,
    handleLogout,
    handleResetAccount
  }
}
