import type { UserProfile } from '@/types'
import type { Database } from '@/types/database.types'

export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient<Database>()
  const cachedUserProfile = useState<UserProfile | null>('user-profile', () => null)

  let user = null

  try {
    const { data } = await supabase.auth.getUser()
    user = data.user

  } catch (error: any) {
    console.warn('Supabase auth session expired, clearing local session...', error.message)
    await supabase.auth.signOut()
    return navigateTo('/auth')
  }

  // 1. 未登入處理
  if (!user?.id) {
    if (!to.path.startsWith('/auth')) {
      return navigateTo('/auth')
    }
    return
  }

  const userId = user.id

  // 💡 抽出重複的角色導向邏輯
  const getRedirectDestination = async (): Promise<string> => {
    // 優先使用快取
    if (cachedUserProfile.value?.id === userId && cachedUserProfile.value?.role) {
      return cachedUserProfile.value.role === 'admin' ? '/admin' : '/home'
    }

    // 無快取則查詢資料庫
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
    
    return profile?.role === 'admin' ? '/admin' : '/home'
  }

  // 2. 已登入但訪問登入頁
  if (to.path === '/auth') {
    const dest = await getRedirectDestination()
    return navigateTo(dest)
  }

  // 3. 檢查資料完整性 (排除 auth 相關頁面)
  const isAuthPage = to.path.startsWith('/auth')
  if (!isAuthPage) {
    const hasCachedProfile = cachedUserProfile.value?.id === userId
    
    if (!hasCachedProfile) {
      // 檢查 metadata 是否標記已完成註冊
      const metadata = user.user_metadata || {}
      const isCompleted = metadata.social_signup_completed || metadata.google_signup_completed

      if (!isCompleted) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle()

        if (!profile) {
          return navigateTo('/auth/social-signup')
        }
      }
    }
  }

  // 4. 根目錄跳轉
  if (to.path === '/') {
    const dest = await getRedirectDestination()
    return navigateTo(dest, { replace: true })
  }
})