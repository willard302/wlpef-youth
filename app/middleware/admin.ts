import { getRoleDestination, isAdminRole } from '~/utils/auth'

export default defineNuxtRouteMiddleware(async () => {
  const { userProfile, loadUserData } = useUser()

  if (!userProfile.value) {
    await loadUserData(true)
  }

  if (!userProfile.value) {
    return navigateTo('/home')
  }

  if (!isAdminRole(userProfile.value.role)) {
    return navigateTo(getRoleDestination(userProfile.value.role))
  }
})
