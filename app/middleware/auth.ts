import type { UserProfile } from '@/types'
import type { Database } from '@/types/database.types'
import { userService } from '@/services/userService'

export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient<Database>()
  const cachedUserProfile = useState<UserProfile | null>('user-profile', () => null)

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) {
    console.warn('auth middleware getUser error:', userError.message)
  }

  if (!user?.id) {
    if (!to.path.startsWith('/auth')) {
      return navigateTo('/auth/login')
    }
    return
  }

  if (to.path === '/auth/login' || to.path === '/auth/register') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    
    const dest = profile?.role === 'admin' ? '/admin' : '/home'
    return navigateTo(dest)
  }

  const excludedPaths = [
    '/auth/login', 
    '/auth/register',
    '/auth/confirm', 
    '/auth/social-signup'
  ]
  if (!excludedPaths.includes(to.path)) {
    if (!user.email) {
      return navigateTo('/auth/social-signup')
    }

    const hasCachedProfile = cachedUserProfile.value?.id === user.id
    if (!hasCachedProfile) {
      // 檢查 profiles 是否已有資料 (比對 email)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', user.email)
        .maybeSingle()

      if (!existingProfile) {
        return navigateTo('/auth/social-signup')
      }

      try {
        await userService.ensureProfileExists(supabase)
      } catch (error) {
        console.warn('auth middleware ensureProfileExists error:', error)
        return navigateTo('/auth/social-signup')
      }
    }
  }

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
