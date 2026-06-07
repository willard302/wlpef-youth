export default defineNuxtRouteMiddleware( async() => {
  const {userProfile, loadUserData} = useUser()

  if (!userProfile.value) {
    await loadUserData()
  }

  if (userProfile.value?.role !== 'admin') {
    return navigateTo('/home')
  }
})
