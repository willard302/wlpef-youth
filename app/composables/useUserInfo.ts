import type { UserInfoFormData } from '@/types'

/**
 * 管理用戶信息編輯頁面的狀態與邏輯
 */
export function useUserInfo() {
  const { userProfile, loadUserData, updateUserProfile, isUpdatingProfile } = useUser()

  // 表單狀態
  const formData = ref<UserInfoFormData>({
    email: '',
    gender: '',
    name: '',
    department: '',
    phoneNumber: '',
    bio: ''
  })

  const isLoading = ref(false)
  const isSaving = computed(() => isUpdatingProfile.value)
  const error = ref<string | null>(null)
  const success = ref(false)

  // 載入用戶信息用於預填表單
  const loadUserInfo = async () => {
    isLoading.value = true
    error.value = null

    try {
      await loadUserData()
      const profile = userProfile.value

      if (!profile) {
        throw new Error('載入用戶信息失敗')
      }

      formData.value = {
        email: profile.email || '',
        name: profile.name || '',
        gender: profile.gender || '',
        department: profile.department || '',
        phoneNumber: profile.phoneNumber || '',
        bio: profile.bio || ''
      }
    } catch (err: any) {
      error.value = err.message || '載入用戶信息失敗'
      console.error(err)
    } finally {
      isLoading.value = false
    }
  }

  // 更新用戶信息
  const updateUserInfo = async () => {
    error.value = null
    success.value = false

    try {
      await updateUserProfile({
        email: formData.value.email,
        name: formData.value.name,
        gender: formData.value.gender,
        department: formData.value.department,
        phoneNumber: formData.value.phoneNumber,
        bio: formData.value.bio
      })

      await loadUserInfo()

      success.value = true
      // 3 秒後清除成功提示
      setTimeout(() => {
        success.value = false
      }, 3000)
    } catch (err: any) {
      error.value = err.message || '保存失敗'
      console.error(err)
      throw err
    }
  }

  return {
    formData,
    isLoading,
    isSaving,
    error,
    success,
    loadUserInfo,
    updateUserInfo
  }
}
