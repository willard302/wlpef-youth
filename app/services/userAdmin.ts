import type { ProfileRow, Database, Role, ProfileUpdate, ProfileInsert } from '~/types'

const getSupabase = () => useSupabaseClient<Database>()

export const userAdminService = {
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

      return (data || []).map((profile) => mapProfileRow(profile))
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
}