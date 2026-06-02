export default defineNuxtRouteMiddleware(async (to) => {
  const supabase = useSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check if user is in password recovery mode
  const isPasswordRecovery = useCookie('is_password_recovery')
  if (isPasswordRecovery.value === 'true') {
    if (to.path !== '/auth/reset-password') {
      return navigateTo('/auth/reset-password')
    }
    return
  }

  if (!user) {
    if (!to.path.startsWith('/auth')) {
      return navigateTo('/auth/login')
    }
    return
  }

  if (to.path === '/auth/login' || to.path === '/auth/register') {
    return navigateTo('/home')
  }

  const excludedPaths = ['/auth/login', '/auth/register', '/auth/confirm', '/auth/reset-password', '/auth/social-signup']
  if (!excludedPaths.includes(to.path)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('department')
      .eq('id', user.id)
      .maybeSingle()

    if (!user.email || !profile || !profile.department) {
      return navigateTo('/auth/social-signup')
    }
  }

  if (to.path === '/') {
    return navigateTo('/home', { replace: true })
  }
})
