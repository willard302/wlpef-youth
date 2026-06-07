export const useProfileAvatarUpload = () => {

  const { uploadAvatar, userProfile } = useUser()

  const { error: showErrorToast } = useToast()

  // 檔案輸入引用
  const fileInput = ref<HTMLInputElement | null>(null)

  // 處理大頭照點擊
  const handleAvatarClick = () => {
    fileInput.value?.click()
  }

  // 處理檔案選擇
  const handleFileSelect = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (!file) return

    try {
      await uploadAvatar(file)
      // 成功上傳後清除檔案輸入
      if (fileInput.value) {
        fileInput.value.value = ''
      }
    } catch (err: any) {
      // 顯示錯誤Toast
      showErrorToast(err.message || '上傳大頭照失敗')
      // 清除檔案輸入
      if (fileInput.value) {
        fileInput.value.value = ''
      }
    }
  }

  // 獲取大頭照URL，如果沒有則使用預設圖片
  const getAvatarUrl = () => {
    return userProfile.value?.avatar || '/images/avatar_default.png'
  }
  return {
    fileInput,
    handleAvatarClick,
    handleFileSelect,
    getAvatarUrl
  }
}
