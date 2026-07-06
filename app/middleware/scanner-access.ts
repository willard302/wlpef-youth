export default defineNuxtRouteMiddleware(() => {
  const { userProfile } = useUser()

  const canUseScanner =
    userProfile.value?.role === 'admin' ||
    userProfile.value?.role === 'staff'

  if (!canUseScanner) {
    return navigateTo('/home')
  }
})
