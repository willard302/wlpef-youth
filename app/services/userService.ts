import type { Activity, Role, PointTransaction } from '~/types'
import type { Database } from '~/types/database.types'
import type { ProfileRow, ProfileUpdate, ProfileInsert } from '~/types/database'

type TypedSupabaseClient = ReturnType<typeof useSupabaseClient<Database>>
const getSupabase = () => useSupabaseClient<Database>()

// 使用者相關的 API 服務，負責網路請求 (Data Layer)
export const userService = {
  // 取得使用者詳細資料
  async fetchUserProfile(): Promise<ProfileRow> {
    try {
      const supabase = getSupabase()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) throw new Error('User not authenticated')

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) throw profileError

      const metadata = user.user_metadata || {}

      return {
        id: user.id,
        email: profile?.email || user.email || '',
        name: profile?.name || metadata.name || user.email?.split('@')[0] || 'User',
        role: (profile?.role as Role) || 'member',
        scan_permission: profile?.scan_permission ?? false,
        created_at: profile?.created_at || metadata.join_date || 'Since 2024',
        points: profile?.points ?? 0,
        avatar_url: profile?.avatar_url || metadata.avatar_url || null,
        updated_at: profile?.updated_at || null
      }
    } catch (error: any) {
      if (error?.message === 'User not authenticated' || error?.name === 'AuthSessionMissingError') {
        throw error
      }
      console.error('[userService] Error fetching user profile:', error)
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

      if (file.size > 3 * 1024 * 1024) throw new Error('檔案大小不能超過 3MB')
      if (!file.type.startsWith('image/')) throw new Error('請選擇圖片檔案')

      const fileName = `${user.id}`

      const { error } = await supabase.storage
        .from('icc_avatar')
        .upload(fileName, file, {
          cacheControl: '0', // 設為 0 避免 CDN 強力快取
          upsert: true
        })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('icc_avatar')
        .getPublicUrl(fileName)

      const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`

      // 更新 profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

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
      if (!avatarPath) return
      await supabase.storage.from('icc_avatar').remove([avatarPath])
    } catch (error) {
      console.error('[userService] Error deleting old avatat:', error)
    }
  },

  /**
   * 取得使用者的近期活動
   */
  async fetchRecentActivities(): Promise<Activity[]> {
    return [
      {
        type: 'event',
        date: 'Yesterday',
        title: 'Weekly Gathering',
        duration: '1 hour',
        icon: 'groups'
      }
    ]
  },

  // 初始化使用者 metadata（於註冊時調用）
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

      const dbData: any = {
        id: user.id,
        updated_at: new Date().toISOString()
      }
      
      if (profileData.email !== undefined) dbData.email = profileData.email
      else if (user.email) dbData.email = user.email

      if (profileData.name !== undefined) dbData.name = profileData.name
      if (profileData.points !== undefined) dbData.points = profileData.points
      if (profileData.role !== undefined) dbData.role = profileData.role
      if (profileData.scanPermission !== undefined) dbData.scan_permission = profileData.scanPermission

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
  async fetchAllProfiles(): Promise<ProfileRow[]> {
    try {
      const supabase = getSupabase()
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
        scan_permission: profile.scan_permission ?? false,
        created_at: profile.created_at || 'Since 2026',
        points: profile.points ?? 0,
        avatar_url: profile.avatar_url || null,
        updated_at: profile.updated_at || null
      }))
    } catch (error: any) {
      console.error('Error fetching all profiles:', error)
      throw error
    }
  },

  // (管理員) 透過 Edge Function 建立新會員並發送邀請
  async adminCreateMember(memberData: ProfileInsert): Promise<void> {
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

  // (管理員) 更新指定會員的資料
  async adminUpdateProfile(
    userId: string,
    profileData: ProfileUpdate
  ): Promise<void> {
    try {
      const supabase = getSupabase()
      
      const dbUpdate: ProfileUpdate = {}
      if (profileData.name !== undefined) dbUpdate.name = profileData.name
      if (profileData.points !== undefined) dbUpdate.points = profileData.points
      if (profileData.role !== undefined) dbUpdate.role = profileData.role as Role
      if (profileData.scan_permission !== undefined) dbUpdate.scan_permission = profileData.scan_permission

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

  // 取得點數紀錄
  async fetchPointTransactions(): Promise<PointTransaction[]> {
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('point_transactions')
        .select(`*, events(title)`)
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

  // (管理員) 取得系統中所有的點數交易紀錄
  async fetchAllPointTransactions(): Promise<PointTransaction[]> {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('point_transactions')
        .select(`*, events(title), profiles(name, email)`)
        .order('created_at', { ascending: false })
        .limit(1000)

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

  // 重置使用者帳號 (透過 Edge Function)
  async resetUserAccount(userId?: string): Promise<void> {
    try {
      const supabase = useSupabaseClient()
      const { data, error } = await supabase.functions.invoke('reset-user-account', {
        method: 'POST',
        body: userId ? { userId } : {}
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || '重置帳號失敗')
    } catch (error: any) {
      console.error('Error resetting user account:', error)
      throw error
    }
  }
}
