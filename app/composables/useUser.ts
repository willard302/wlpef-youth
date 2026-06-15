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
  const loadingPromise = useState<Promise<void> | null>('user-loading-promise', () => null)
  const profileSubscription = useState<any>('user-profile-subscription', () => null)
  const isSettingUpListener = useState('user-profile-listener-loading', () => false)

  // 狀態物件化：合併原本分散的 loading 與 error
  const status = useState('user-status', () => ({
    loading: false,
    uploading: false,
    updating: false,
    error: null as string | null
  }))

  // 動作 (Actions)
  const setupProfileListener = async () => {
    if (profileSubscription.value || isSettingUpListener.value) return
    isSettingUpListener.value = true

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || profileSubscription.value) return
      
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
    } catch (err) {
      console.error('建立 Profile 監聽器失敗:', err)
    } finally {
      isSettingUpListener.value = false
    }
  }

  const loadUserData = async (force = false) => {
    // 如果已經有資料且不是強制更新，則跳過
    if (userProfile.value && !force) {
      setupProfileListener()
      return
    }

    // 若已有進行中的請求，等待完成即可，不重複發送
    if (loadingPromise.value && !force) {
      return await loadingPromise.value
    }

    const request = (async () => {
      status.value.loading = true
      status.value.error = null
      try {
        const [profileData, activitiesData] = await Promise.all([
          userService.fetchUserProfile(),
          userService.fetchRecentActivities()
        ])

        userProfile.value = profileData
        recentActivities.value = activitiesData
        setupProfileListener()
      } catch (err: any) {
        status.value.error = err.message || '載入用戶資料失敗'
        if (err.message === 'User not authenticated') {
          router.push('/auth')
        }
      } finally {
        status.value.loading = false
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
    status.value.uploading = true
    status.value.error = null

    try {
      const avatarUrl = await userService.uploadAvatar(file, supabase)
      userProfile.value.avatar = avatarUrl
      await loadUserData(true)
    } catch (err: any) {
      status.value.error = err.message || '上傳大頭照失敗'
      throw err
    } finally {
      status.value.uploading = false
    }
  }

  const updateUserProfile = async (profileData: any) => {
    if (!userProfile.value) return
    status.value.updating = true
    status.value.error = null

    try {
      await userService.updateUserProfile(supabase, profileData)
      await loadUserData(true)
    } catch (err: any) {
      status.value.error = err.message || '更新個人資料失敗'
      throw err
    } finally {
      status.value.updating = false
    }
  }

  const clearUserData = () => {
    if (profileSubscription.value) {
      supabase.removeChannel(profileSubscription.value)
      profileSubscription.value = null
    }
    userProfile.value = null
    recentActivities.value = []
    status.value.error = null
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      clearUserData()
      router.push('/auth')
    } catch (err) {
      clearUserData()
      router.push('/auth')
    }
  }

  const handleResetAccount = async (userId?: string) => {
    try {
      status.value.loading = true
      await userService.resetUserAccount(userId)
      const { data: { user } } = await supabase.auth.getUser()
      if (!userId || userId === user?.id) {
        clearUserData()
        router.push('/auth')
      }
    } catch (err: any) {
      status.value.error = err.message || '重置帳號失敗'
      throw err
    } finally {
      status.value.loading = false
    }
  }

  const completeSocialSignup = async (socialSignupData: {
    fullName: string
    points: number
  }) => {
    status.value.updating = true
    status.value.error = null

    try {
      await userService.updateUserProfile(supabase, {
        name: socialSignupData.fullName,
        points: socialSignupData.points
      })

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      await supabase.auth.updateUser({
        data: {
          ...(user.user_metadata || {}),
          social_signup_completed: true,
          google_signup_completed: true
        }
      })

      await loadUserData(true)
    } catch (err: any) {
      status.value.error = err.message || '完成註冊失敗'
      throw err
    } finally {
      status.value.updating = false
    }
  }

  // ✨ 自動初始化：只要在 Client 端調用 useUser，就確保資料有在載入
  if (process.client && getCurrentInstance()) {
    onMounted(() => {
      const isAuthPage = router.currentRoute.value.path.startsWith('/auth')
      if (!userProfile.value && !status.value.loading && !isAuthPage) {
        loadUserData()
      }
    })
  }

  return {
    userProfile,
    recentActivities,
    status, // 暴露 status 物件取代多個 loading 變數
    // 為了向下相容，可以選擇保留舊的變數(選配)，但在這裡我們依據建議進行精簡
    isLoading: computed(() => status.value.loading),
    isUploadingAvatar: computed(() => status.value.uploading),
    isUpdatingProfile: computed(() => status.value.updating),
    error: computed(() => status.value.error),
    loadUserData,
    clearUserData,
    uploadAvatar,
    updateUserProfile,
    completeSocialSignup,
    handleLogout,
    handleResetAccount
  }
}
