import { userService } from '~/services/user'
import type { Database } from '~/types/database.types'

export const useAdminUser = () => {

  const router = useRouter()
  const { clearUserData } = useUser()
  const supabase = useSupabaseClient<Database>()

  const status = useState('admin-user-status', () => ({
    loading: false,
    uploading: false,
    updating: false,
    error: null as string | null
  }))

  const handleResetAccount = async (userId?: string) => {
    try {
      status.value.loading = true
      await userService.resetUserAccount(userId)
      const { data: { user } } = await supabase.auth.getUser()
      if (!userId || userId === user?.id) {
        clearUserData()
        router.push('/auth')
      }
    } catch (err: any) {
      status.value.error = err.message || '重置帳號失敗'
      throw err
    } finally {
      status.value.loading = false
    }
  }

  return {
    status,
    isAdminLoading: computed(() => status.value.loading),
    adminError: computed(() => status.value.error),
    handleResetAccount
  }
}
