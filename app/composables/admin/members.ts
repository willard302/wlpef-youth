import type { ProfileRow } from "~/types"
import { userAdminService } from '~/services/userAdmin.js'

export const useAdminMembers = () => {
  
  const { addToast } = useToast()
  const { searchQuery } = useSearch()

  const isLoading = ref(true)
  const profiles = ref<ProfileRow[]>([])
  const isCreating = ref(false)
  const isUpdating = ref(false)

  const showAddModal = ref(false)
  const showEditModal = ref(false)
  const selectedProfile = ref<ProfileRow | null>(null)

  const currentPage = ref(1)
  const itemsPerPage = 15


  const filteredProfiles = computed(() => {
    const keyword = searchQuery.value.trim().toLowerCase()

    if (!keyword) {
      return profiles.value
    }

    return profiles.value.filter((profile) => {
      return (
        profile.name.toLowerCase().includes(keyword) ||
        (profile.email?.toLowerCase().includes(keyword) ?? false)
      )
    })
  })

  const paginatedProfiles = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredProfiles.value.slice(start, end)
  })


  const openEditModal = (profile: ProfileRow) => {
    selectedProfile.value = profile
    showEditModal.value = true
  }

  const loadProfiles = async () => {
    isLoading.value = true
    try {
      profiles.value = await userAdminService.fetchAllProfiles()
    } catch (err: any) {
      addToast(err.message || '載入會員列表失敗', 'error')
    } finally {
      isLoading.value = false
    }
  }

  const handleUpdateMember = async (formData: any) => {
    if (!selectedProfile.value?.id) return

    isUpdating.value = true
    try {
      await userAdminService.adminUpdateProfile(selectedProfile.value.id, {
        name: formData.name,
        role: formData.role,
        points: formData.points,
        scan_permission: formData.role === 'staff' ? true : formData.scanPermission
      })
      addToast('會員資料更新成功', 'success')
      showEditModal.value = false
      await loadProfiles()
    } catch (err: any) {
      addToast(err.message || '更新會員失敗', 'error')
    } finally {
      isUpdating.value = false
    }
  }

  const handleAddMember = async (formData: any) => {
    if (!formData.email || !formData.name) {
      addToast('請填寫 Email 與姓名', 'error')
      return
    }

    isCreating.value = true
    try {
      await userAdminService.adminCreateMember({
        id: '',
        email: formData.email,
        name: formData.name,
        role: formData.role,
        points: formData.points,
        scan_permission: formData.role === 'staff' ? true : formData.scanPermission
      })
      addToast('會員建立成功並已發送邀請', 'success')
      showAddModal.value = false
      await loadProfiles()
    } catch (err: any) {
      addToast(err.message || '建立會員失敗', 'error')
    } finally {
      isCreating.value = false
    }
  }

  return {
    isLoading,
    profiles,
    isCreating,
    isUpdating,
    showAddModal,
    showEditModal,
    selectedProfile,
    currentPage,
    itemsPerPage,
    filteredProfiles,
    paginatedProfiles,
    searchQuery,
    openEditModal,
    loadProfiles,
    handleUpdateMember,
    handleAddMember,
  }
}
