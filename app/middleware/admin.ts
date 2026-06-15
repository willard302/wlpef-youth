export default defineNuxtRouteMiddleware(() => {
  const { userProfile } = useUser()

  if (userProfile.value?.role !== 'admin') {
    return navigateTo('/home')
  }
})
