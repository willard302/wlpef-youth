import type { Activity, PointTransaction, Database, ProfileRow, PaymentStatusSummary } from '~/types'

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

      return mapProfileRow(profile, user)
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

  async fetchLatestPaymentStatus(): Promise<PaymentStatusSummary | null> {
    try {
      const supabase = getSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('event_registrations')
        .select('donation_year, registration_fee')
        .eq('matched_user_id', user.id)
        .order('form_submitted_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error

      const registration = data?.[0]
      if (!registration) {
        return {
          hasDonationYear: false,
          hasRegistrationFee: false,
          hasAnyPayment: false,
          label: '未繳費',
          tone: 'danger',
        }
      }

      const hasDonationYear = registration.donation_year === true
      const hasRegistrationFee = registration.registration_fee === true
      const hasAnyPayment = hasDonationYear || hasRegistrationFee

      if (!hasAnyPayment) {
        return {
          hasDonationYear,
          hasRegistrationFee,
          hasAnyPayment,
          label: '未繳費',
          tone: 'danger',
        }
      }

      const labels: string[] = []
      if (hasDonationYear) labels.push('年度捐贈')
      if (hasRegistrationFee) labels.push('活動報名費')

      return {
        hasDonationYear,
        hasRegistrationFee,
        hasAnyPayment,
        label: labels.join('／'),
        tone: 'success',
      }
    } catch (error: any) {
      if (error?.message === 'User not authenticated' || error?.name === 'AuthSessionMissingError') {
        throw error
      }
      console.error('Error fetching latest payment status:', error)
      return null
    }
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
   */
  async updateUserProfile(
    supabase: TypedSupabaseClient,
    profileData: {
      email?: string
      name?: string
      role?: string
    }
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const dbData: any = {
        id: user.id,
        updated_at: new Date().toISOString()
      }
      
      dbData.email = profileData.email !== undefined ? profileData.email : (user.email || '')
      if (profileData.name !== undefined) dbData.name = profileData.name
      if (profileData.role !== undefined) dbData.role = profileData.role

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
