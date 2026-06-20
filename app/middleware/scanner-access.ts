export default defineNuxtRouteMiddleware(() => {
  const { userProfile } = useUser()

  const canUseScanner =
    userProfile.value?.role === 'admin' ||
    userProfile.value?.role === 'staff' ||
    userProfile.value?.scan_permission === true

  if (!canUseScanner) {
    return navigateTo('/home')
  }
})
