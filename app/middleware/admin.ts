export default defineNuxtRouteMiddleware(async () => {
  const { userProfile, loadUserData } = useUser()

  if (!userProfile.value) {
    await loadUserData(true)
  }

  if (!userProfile.value) {
    return navigateTo('/home')
  }

  if (userProfile.value.role !== 'admin') {
    return navigateTo('/home')
  }
})
