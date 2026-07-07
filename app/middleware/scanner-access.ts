import { canUseScannerRole } from '~/utils/auth'

export default defineNuxtRouteMiddleware(() => {
  const { userProfile } = useUser()

  const canUseScanner = canUseScannerRole(userProfile.value?.role)

  if (!canUseScanner) {
    return navigateTo('/home')
  }
})
