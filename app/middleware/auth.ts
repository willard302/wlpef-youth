import type { Database } from '@/types/database.types'

export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient<Database>()
  const { userProfile, loadUserData } = useUser()

  const { data: { user } } = await supabase.auth.getUser()

  // 1. 未登入處理
  if (!user?.id) {
    if (!to.path.startsWith('/auth')) {
      return navigateTo('/auth')
    }
    return
  }

  // 確保用戶資料已載入
  if (!userProfile.value) {
    await loadUserData()
  }

  // 💡 角色導向邏輯
  const getRedirectDestination = (): string => {
    return userProfile.value?.role === 'admin' ? '/admin' : '/home'
  }

  // 2. 已登入但訪問登入頁
  if (to.path === '/auth') {
    return navigateTo(getRedirectDestination())
  }

  // 3. 檢查資料完整性 (排除 auth 相關頁面)
  const isAuthPage = to.path.startsWith('/auth')
  if (!isAuthPage && !userProfile.value) {
    // 如果 loadUserData 失敗且沒資料，可能需要補填資料
    const metadata = user.user_metadata || {}
    const isCompleted = metadata.social_signup_completed || metadata.google_signup_completed
    
    if (!isCompleted) {
      return navigateTo('/auth/social-signup')
    }
  }

  // 4. 根目錄跳轉
  if (to.path === '/') {
    return navigateTo(getRedirectDestination(), { replace: true })
  }
})