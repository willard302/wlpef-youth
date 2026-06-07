import type { UserProfile } from '@/types'

export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()
  const cachedUserProfile = useState<UserProfile | null>('user-profile', () => null)

  // Check if user is in password recovery mode
  const isPasswordRecovery = useCookie('is_password_recovery')
  if (isPasswordRecovery.value === 'true') {
    if (to.path !== '/auth/reset-password') {
      return navigateTo('/auth/reset-password')
    }
    return
  }

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
    return navigateTo('/home')
  }

  const excludedPaths = [
    '/auth/login', 
    '/auth/register', 
    '/auth/confirm', 
    '/auth/reset-password', 
    '/auth/social-signup'
  ]
  if (!excludedPaths.includes(to.path)) {
    const hasCachedProfile = cachedUserProfile.value?.id === user.id
    let profile = hasCachedProfile ? { id: user.id } : null

    if (!profile) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      profile = data
    }

    if (!user.email || !profile) {
      return navigateTo('/auth/social-signup')
    }
  }

  if (to.path === '/') {
    return navigateTo('/home', { replace: true })
  }
})
