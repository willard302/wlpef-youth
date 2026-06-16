export const useProfileAvatarUpload = () => {
  const { uploadAvatar, userProfile } = useUser()
  const { error: showErrorToast } = useToast()

  // 處理 Vant Uploader 的檔案讀取後回調
  const handleAfterRead = async (fileItem: any) => {
    // Vant 傳入的可能是單個對象或數組，這裡處理單個對象
    const file = fileItem.file
    if (!file) return

    try {
      await uploadAvatar(file)
    } catch (err: any) {
      showErrorToast(err.message || '上傳大頭照失敗')
    }
  }

  // 獲取大頭照URL，如果沒有則使用預設圖片
  const getAvatarUrl = () => {
    const rawUrl = userProfile.value?.avatar
    if (!rawUrl) return '/apple-touch-icon.png'
    
    // 如果是 Supabase 的圖片，加入縮放參數優化加載速度 (LCP 優化)
    if (rawUrl.includes('.supabase.co')) {
      return `${rawUrl}?width=200&height=200&resize=cover`
    }
    return rawUrl
  }

  return {
    handleAfterRead,
    getAvatarUrl
  }
}
