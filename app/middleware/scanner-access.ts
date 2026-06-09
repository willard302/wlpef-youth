export default defineNuxtRouteMiddleware(async () => {
  const { userProfile, loadUserData } = useUser()

  if (!userProfile.value) {
    await loadUserData()
  }

  const canUseScanner =
    userProfile.value?.role === 'admin' || userProfile.value?.scanPermission === true

  if (!canUseScanner) {
    return navigateTo('/home')
  }
})