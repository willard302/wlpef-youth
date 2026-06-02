import { userService } from '@/services/userService'
import type { UserInfoFormData } from '@/types'

/**
 * 管理用戶信息編輯頁面的狀態與邏輯
 */
export function useUserInfo() {
  const supabase = useSupabaseClient()

  // 表單狀態
  const formData = ref<UserInfoFormData>({
    name: '',
    department: '',
    phoneNumber: '',
    gender: '',
    bio: ''
  })

  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)
  const success = ref(false)

  // 載入用戶信息用於預填表單
  const loadUserInfo = async () => {
    isLoading.value = true
    error.value = null

    try {
      const profile = await userService.fetchUserProfile()

      formData.value = {
        name: profile.name || '',
        department: profile.department || '',
        phoneNumber: profile.phoneNumber || '',
        gender: profile.gender || '',
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
    isSaving.value = true
    error.value = null
    success.value = false

    try {
      // 使用統一的 updateUserProfile 方法更新所有字段
      await userService.updateUserProfile(supabase, {
        name: formData.value.name,
        department: formData.value.department,
        phoneNumber: formData.value.phoneNumber,
        gender: formData.value.gender,
        bio: formData.value.bio
      })

      success.value = true
      // 3 秒後清除成功提示
      setTimeout(() => {
        success.value = false
      }, 3000)
    } catch (err: any) {
      error.value = err.message || '保存失敗'
      console.error(err)
      throw err
    } finally {
      isSaving.value = false
    }
  }

  // 初始化時載入用戶信息
  onMounted(() => {
    loadUserInfo()
  })

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
