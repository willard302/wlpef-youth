export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()

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
    // 這裡可以考慮將 profile 快取在全域狀態中，減少 middleware 阻塞
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!user.email || !profile) {
      return navigateTo('/auth/social-signup')
    }
  }

  if (to.path === '/') {
    return navigateTo('/home', { replace: true })
  }
})
