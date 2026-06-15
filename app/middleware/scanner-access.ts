export default defineNuxtRouteMiddleware(() => {
  const { userProfile } = useUser()

  const canUseScanner =
    userProfile.value?.role === 'admin' || userProfile.value?.scanPermission === true

  if (!canUseScanner) {
    return navigateTo('/home')
  }
})