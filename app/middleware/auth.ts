import type { Database } from '~/types'
import { getRoleDestination } from '~/utils/auth'
export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient<Database>()

  const user = useSupabaseUser()
  const { userProfile, loadUserData } = useUser()

  // 1. 未登入處理
  if (!user.value?.sub) {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    if (!to.path.startsWith('/auth')) {
      return navigateTo('/auth')
    }
    return
  }

  // 確保用戶資料已載入
  if (!userProfile.value) {
    await loadUserData()
  }

  // 2. 已登入但訪問登入頁
  if (to.path === '/auth') {
    return navigateTo(getRoleDestination(userProfile.value?.role))
  }

  // 3. 檢查資料完整性 (排除 auth 相關頁面)
  const isAuthPage = to.path.startsWith('/auth')
  if (!isAuthPage && !userProfile.value) {
    // 如果 loadUserData 失敗且沒資料，可能需要補填資料
    const metadata = user.value.user_metadata || {}
    const isCompleted = metadata.social_signup_completed || metadata.google_signup_completed
    
    if (!isCompleted) {
      return navigateTo('/auth/social-signup')
    }
  }

  // 4. 根目錄跳轉
  if (to.path === '/') {
    return navigateTo(getRoleDestination(userProfile.value?.role), { replace: true })
  }
})
