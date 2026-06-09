import type { UserProfile, Activity, Role, PointTransaction } from '@/types'
import type { Database } from '@/types/database.types'

type TypedSupabaseClient = ReturnType<typeof useSupabaseClient<Database>>

/**
 * 使用者相關的 API 服務，負責網路請求 (Data Layer)
 */
export const userService = {
  /**
   * 確保當前登入使用者在 profiles 表中有對應資料
   */
  async ensureProfileExists(supabase: TypedSupabaseClient): Promise<void> {
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) throw userError
    if (!user?.id) throw new Error('User not authenticated')

    const { data: existingProfile, error: profileQueryError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileQueryError) throw profileQueryError
    if (existingProfile) return

    const metadata = user.user_metadata || {}
    const profileName = metadata.name || metadata.display_name || metadata.full_name || user.email?.split('@')[0] || 'User'

    const { error: createProfileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        name: profileName,
        avatar_url: metadata.avatar_url || null,
        points: 0
      })

    if (createProfileError && createProfileError.code !== '23505') {
      throw createProfileError
    }
  },

  /**
   * 取得使用者詳細資料
   */
  async fetchUserProfile(): Promise<UserProfile> {
    try {
      const supabase = useSupabaseClient<Database>()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError) throw userError

      if (!user) throw new Error('User not authenticated')

      // 優先從 profiles 表獲取最新的詳細資料
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) throw profileError

      const metadata = user.user_metadata || {}
      const points = profile?.points ?? 0

      return {
        id: user.id,
        email: profile?.email || user.email || '',
        name: profile?.name || metadata.name || user.email?.split('@')[0] || 'User',
        role: (profile?.role as Role) || 'member',
        scanPermission: profile?.scan_permission ?? false,
        joinDate: profile?.created_at || metadata.join_date || 'Since 2024',
        department: profile?.department || metadata.department || '',
        points,
        avatar: profile?.avatar_url || metadata.avatar_url || undefined,
        phoneNumber: profile?.phone_number || metadata.phone_number || '',
        gender: profile?.gender || metadata.gender || '',
        bio: profile?.bio || metadata.bio || ''
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error)
      if (error?.message === 'User not authenticated') {
        throw error
      }
      throw new Error(error?.message || '載入用戶資料失敗')
    }
  },

  /**
   * 上傳大頭照
   */
  async uploadAvatar(file: File, supabase: TypedSupabaseClient): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('User not authenticated')

      // 檢查檔案大小 (3MB)
      if (file.size > 3 * 1024 * 1024) {
        throw new Error('檔案大小不能超過 3MB')
      }

      // 檢查檔案類型
      if (!file.type.startsWith('image/')) {
        throw new Error('請選擇圖片檔案')
      }

      // 生成檔案名稱 (user_id + timestamp + extension)
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}_${Date.now()}.${fileExt}`

      // 如果有舊的大頭照，先刪除
      const currentMetadata = user.user_metadata || {}
      if (currentMetadata.avatar_path) {
        await userService.deleteOldAvatar(currentMetadata.avatar_path, supabase)
      }

      // 上傳到 Supabase Storage
      const { data, error } = await supabase.storage
        .from('icc_avatar')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      // 取得公開 URL
      const { data: urlData } = supabase.storage
        .from('icc_avatar')
        .getPublicUrl(fileName)
      const publicUrl = urlData.publicUrl

      // 1. 更新 profiles 表
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      // 2. 更新 auth metadata
      return publicUrl
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      throw new Error(error.message || '上傳大頭照失敗')
    }
  },

  /**
   * 刪除舊的大頭照檔案
   */
  async deleteOldAvatar(avatarPath: string, supabase: TypedSupabaseClient): Promise<void> {
    try {
      if (avatarPath) {
        await supabase.storage
          .from('icc_avatar')
          .remove([avatarPath])
      }
    } catch (error) {
      console.error('Error deleting old avatar:', error)
      // 不拋出錯誤，因為這不是關鍵操作
    }
  },

  /**
   * 取得使用者的近期活動
   */
  async fetchRecentActivities(): Promise<Activity[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            type: 'event',
            date: 'Yesterday',
            title: 'Weekly Gathering',
            duration: '1 hour',
            icon: 'groups'
          }
        ])
      }, 300)
    })
  },

  /**
   * 初始化使用者 metadata（於註冊時調用）
   */
  async initializeUserMetadata(
    supabase: TypedSupabaseClient,
    displayName: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('User not authenticated')

      const currentMetadata = user.user_metadata || {}
      
      // 更新用戶 metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          ...currentMetadata,
          name: displayName,
          display_name: displayName,
          join_date: new Date().toISOString().split('T')[0],
          department: ''
        }
      })

      if (error) throw error
    } catch (error: any) {
      console.error('Error initializing user metadata:', error)
      throw new Error(error.message || 'Failed to initialize user metadata')
    }
  },

  /**
   * 更新使用者的完整資料
   * @param supabase Supabase 客戶端實例
   * @param profileData 用戶資料物件
   */
  async updateUserProfile(
    supabase: TypedSupabaseClient,
    profileData: {
      email?: string
      name?: string
      points?: number
      role?: string
      scanPermission?: boolean
      department?: string
      phoneNumber?: string
      gender?: string
      bio?: string
    }
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('User not authenticated')

      // 1. 更新 profiles 表
      const dbUpdate: Database['public']['Tables']['profiles']['Update'] = {}
      if (profileData.email !== undefined) dbUpdate.email = profileData.email
      if (profileData.name !== undefined) dbUpdate.name = profileData.name
      if (profileData.points !== undefined) dbUpdate.points = profileData.points
      if (profileData.role !== undefined) dbUpdate.role = profileData.role as Role
      if (profileData.scanPermission !== undefined) dbUpdate.scan_permission = profileData.scanPermission
      if (profileData.department !== undefined) dbUpdate.department = profileData.department
      if (profileData.phoneNumber !== undefined) dbUpdate.phone_number = profileData.phoneNumber
      if (profileData.gender !== undefined) dbUpdate.gender = profileData.gender
      if (profileData.bio !== undefined) dbUpdate.bio = profileData.bio

      const { error: dbError } = await supabase
        .from('profiles')
        .update(dbUpdate)
        .eq('id', user.id)

      if (dbError) throw dbError

      // 註冊後的個人資料編輯僅修改 profiles 表，不再同步更新 auth metadata
      // 這是為了確保數據單一來源，避免 metadata 冗餘
    } catch (error: any) {
      console.error('Error updating user profile:', error)
      throw new Error(error.message || 'Failed to update user profile')
    }
  },

  /**
   * 完成社群登入後的基本資料設置
   */
  async completeSocialSignup(data: {
    id: string
    email: string
    name?: string
    department?: string
    gender?: string
    bio?: string
  }): Promise<void> {
    try {
      const supabase = useSupabaseClient<Database>()
      const profileName = data.name?.trim() || data.email.split('@')[0] || 'User'
      const normalizedDepartment = data.department?.trim() || null
      
      // 1. 在 profiles 表中創建或更新資料
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.id,
          email: data.email,
          name: profileName,
          department: normalizedDepartment,
          gender: data.gender,
          bio: data.bio,
          points: 0,
          updated_at: new Date().toISOString()
        })

      if (profileError) throw profileError

      // 社群登入後的基本資料補填僅修改 profiles 表，不再同步更新 auth metadata
    } catch (error: any) {
      console.error('Error completing social signup:', error)
      throw error
    }
  },

  /**
   * 取得點數紀錄
   */
  async fetchPointTransactions(): Promise<PointTransaction[]> {
    try {
      const supabase = useSupabaseClient<Database>()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('point_transactions')
        .select(`
          *,
          events(title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        eventId: row.event_id,
        points: row.points,
        type: row.type,
        description: row.description,
        createdAt: row.created_at,
        eventTitle: row.events?.title
      }))
    } catch (error: any) {
      console.error('Error fetching point transactions:', error)
      throw error
    }
  },

  /**
   * (管理員) 取得系統中所有的點數交易紀錄
   */
  async fetchAllPointTransactions(): Promise<PointTransaction[]> {
    try {
      const supabase = useSupabaseClient<Database>()
      
      const { data, error } = await supabase
        .from('point_transactions')
        .select(`
          *,
          events(title),
          profiles(name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(1000) // 限制筆數避免效能問題

      if (error) throw error

      return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        eventId: row.event_id,
        points: row.points,
        type: row.type,
        description: row.description,
        createdAt: row.created_at,
        eventTitle: row.events?.title,
        userName: row.profiles?.name,
        userEmail: row.profiles?.email
      }))
    } catch (error: any) {
      console.error('Error fetching all point transactions:', error)
      throw error
    }
  },

  /**
   * 重置使用者帳號 (透過 Edge Function)
   */
  async resetUserAccount(): Promise<void> {
    try {
      const supabase = useSupabaseClient()
      const { data, error } = await supabase.functions.invoke('reset-user-account', {
        method: 'POST'
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || '重置帳號失敗')
    } catch (error: any) {
      console.error('Error resetting user account:', error)
      throw error
    }
  }
}
