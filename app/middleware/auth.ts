import type { UserProfile } from '@/types'
import type { Database } from '@/types/database.types'

export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient<Database>()
  const cachedUserProfile = useState<UserProfile | null>('user-profile', () => null)

  const { data: { user } } = await supabase.auth.getUser()

  // 1. 未登入處理
  if (!user?.id) {
    if (!to.path.startsWith('/auth')) {
      return navigateTo('/auth/login')
    }
    return
  }

  // 2. 已登入但訪問登入頁
  if (to.path === '/auth/login') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    
    const dest = profile?.role === 'admin' ? '/admin' : '/home'
    return navigateTo(dest)
  }

  // 3. 檢查資料完整性 (排除 auth 相關頁面)
  const isAuthPage = to.path.startsWith('/auth')
  if (!isAuthPage) {
    // 檢查是否有 cached profile
    const hasCachedProfile = cachedUserProfile.value?.id === user.id
    
    if (!hasCachedProfile) {
      // 檢查 metadata 是否標記已完成註冊
      const metadata = user.user_metadata || {}
      const isCompleted = metadata.social_signup_completed || metadata.google_signup_completed

      if (!isCompleted) {
        // 檢查 profiles 表是否真的沒有資料
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile) {
          return navigateTo('/auth/social-signup')
        }
      }
    }
  }

  // 4. 根目錄跳轉
  if (to.path === '/') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    
    const dest = profile?.role === 'admin' ? '/admin' : '/home'
    return navigateTo(dest, { replace: true })
  }
})
