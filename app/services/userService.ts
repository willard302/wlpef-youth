import type { UserProfile, Activity, Role, PointTransaction } from '@/types'
import type { Database } from '@/types/database.types'

type TypedSupabaseClient = ReturnType<typeof useSupabaseClient<Database>>

/**
 * 使用者相關的 API 服務，負責網路請求 (Data Layer)
 */
export const userService = {
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
        points,
        avatar: profile?.avatar_url || metadata.avatar_url || undefined
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
          join_date: new Date().toISOString().split('T')[0]
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
    }
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('User not authenticated')

      // 1. 使用 upsert 更新或建立 profiles 表
      const dbData: any = {
        id: user.id,
        updated_at: new Date().toISOString()
      }
      
      if (profileData.email !== undefined) dbData.email = profileData.email
      else if (user.email) dbData.email = user.email

      if (profileData.name !== undefined) dbData.name = profileData.name
      if (profileData.points !== undefined) dbData.points = profileData.points
      if (profileData.role !== undefined) dbData.role = profileData.role as Role
      if (profileData.scanPermission !== undefined) dbData.scan_permission = profileData.scanPermission

      // 如果是新建立且沒有名字，從 metadata 獲取預設值
      if (!dbData.name) {
        const metadata = user.user_metadata || {}
        dbData.name = metadata.name || metadata.full_name || user.email?.split('@')[0] || 'User'
      }

      const { error: dbError } = await supabase
        .from('profiles')
        .upsert(dbData)

      if (dbError) throw dbError
    } catch (error: any) {
      console.error('Error updating user profile:', error)
      throw new Error(error.message || 'Failed to update user profile')
    }
  },

  /**
   * (管理員) 取得系統中所有的會員資料
   */
  async fetchAllProfiles(): Promise<UserProfile[]> {
    try {
      const supabase = useSupabaseClient<Database>()
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map((profile: any) => ({
        id: profile.id,
        email: profile.email || '',
        name: profile.name || 'User',
        role: (profile.role as Role) || 'member',
        scanPermission: profile.scan_permission ?? false,
        joinDate: profile.created_at || 'Since 2024',
        points: profile.points ?? 0,
        avatar: profile.avatar_url || undefined
      }))
    } catch (error: any) {
      console.error('Error fetching all profiles:', error)
      throw error
    }
  },

  /**
   * (管理員) 透過 Edge Function 建立新會員並發送邀請
   */
  async adminCreateMember(memberData: {
    email: string
    name: string
    role?: string
    points?: number
    scanPermission?: boolean
  }): Promise<void> {
    try {
      const supabase = useSupabaseClient()
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        method: 'POST',
        body: memberData
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || '建立會員失敗')
    } catch (error: any) {
      console.error('Error creating member:', error)
      throw error
    }
  },

  /**
   * (管理員) 更新指定會員的資料
   */
  async adminUpdateProfile(
    userId: string,
    profileData: {
      name?: string
      points?: number
      role?: string
      scanPermission?: boolean
    }
  ): Promise<void> {
    try {
      const supabase = useSupabaseClient<Database>()
      
      const dbUpdate: Database['public']['Tables']['profiles']['Update'] = {}
      if (profileData.name !== undefined) dbUpdate.name = profileData.name
      if (profileData.points !== undefined) dbUpdate.points = profileData.points
      if (profileData.role !== undefined) dbUpdate.role = profileData.role as Role
      if (profileData.scanPermission !== undefined) dbUpdate.scan_permission = profileData.scanPermission

      const { error } = await supabase
        .from('profiles')
        .update(dbUpdate)
        .eq('id', userId)

      if (error) throw error
    } catch (error: any) {
      console.error('Error in adminUpdateProfile:', error)
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
