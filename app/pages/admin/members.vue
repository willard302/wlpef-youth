<script setup lang="ts">
import { format as fnsFormat } from 'date-fns'
import { userService } from '@/services/userService'
import type { UserProfile, Role } from '@/types'
import MemberForm from './components/MemberForm.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
  showTabbar: false,
})

const router = useRouter()
const { addToast } = useToast()
const { userProfile, loadUserData } = useUser()

const isLoading = ref(true)
const profiles = ref<UserProfile[]>([])
const searchQuery = ref('')
const isCreating = ref(false)
const isUpdating = ref(false)

const showAddModal = ref(false)
const showEditModal = ref(false)
const selectedProfile = ref<UserProfile | null>(null)

const loadProfiles = async () => {
  isLoading.value = true
  try {
    profiles.value = await userService.fetchAllProfiles()
  } catch (err: any) {
    addToast(err.message || '載入會員列表失敗', 'error')
  } finally {
    isLoading.value = false
  }
}

const openEditModal = (profile: UserProfile) => {
  selectedProfile.value = profile
  showEditModal.value = true
}

const handleUpdateMember = async (formData: any) => {
  if (!selectedProfile.value?.id) return

  isUpdating.value = true
  try {
    await userService.adminUpdateProfile(selectedProfile.value.id, {
      name: formData.name,
      role: formData.role,
      points: formData.points,
      scanPermission: formData.scanPermission
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
    await userService.adminCreateMember({
      email: formData.email,
      name: formData.name,
      role: formData.role,
      points: formData.points,
      scanPermission: formData.scanPermission
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

const filteredProfiles = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()

  if (!keyword) {
    return profiles.value
  }

  return profiles.value.filter((profile) => {
    return (
      profile.name.toLowerCase().includes(keyword) ||
      profile.email.toLowerCase().includes(keyword)
    )
  })
})

const getRoleLabel = (role: string) => {
  return role === 'admin' ? '管理員' : '一般成員'
}

onMounted(async () => {
  await loadUserData()
  if (userProfile.value?.role !== 'admin') {
    addToast('權限不足', 'error')
    router.replace('/home')
    return
  }
  await loadProfiles()
})
</script>

<template>
  <div class="members-page pb-24 min-h-screen bg-slate-50">
    <AppHeaderPage title="會員管理" />

    <main class="px-4 mt-4 relative z-20 space-y-6">
      <!-- Search and Add -->
      <section class="flex gap-2">
        <div class="relative flex-1">
          <AppIcon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</AppIcon>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋姓名、Email..."
            class="w-full h-12 pl-12 pr-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-primary/50 outline-none text-sm"
          />
        </div>
        <button
          @click="showAddModal = true"
          class="size-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <AppIcon>person_add</AppIcon>
        </button>
      </section>

      <!-- Member Stats -->
      <div v-if="!isLoading" class="grid grid-cols-2 gap-4">
        <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">總會員數</p>
          <p class="text-2xl font-black text-slate-800">{{ profiles.length }}</p>
        </div>
        <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">管理員</p>
          <p class="text-2xl font-black text-indigo-500">
            {{ profiles.filter(p => p.role === 'admin').length }}
          </p>
        </div>
      </div>

      <!-- Member List -->
      <section class="space-y-4">
        <div class="flex items-center justify-between px-2">
          <h4 class="text-sm font-bold text-slate-500 uppercase tracking-widest">會員清單</h4>
          <div v-if="isLoading" class="size-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div v-if="isLoading && profiles.length === 0" class="flex flex-col items-center py-12 text-slate-400">
          <p class="text-xs font-bold tracking-widest">載入會員中...</p>
        </div>

        <div v-else-if="filteredProfiles.length === 0" class="bg-white/50 border-2 border-dashed border-slate-200 rounded-[2rem] py-12 flex flex-col items-center justify-center text-center">
          <AppIcon :size="36" class="text-slate-200 mb-2">group_off</AppIcon>
          <p class="text-slate-400 text-sm font-medium">尚無符合條件的會員</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="profile in filteredProfiles"
            :key="profile.id"
            @click="openEditModal(profile)"
            class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div
              class="size-12 rounded-2xl bg-slate-100 bg-cover bg-center shrink-0"
              :style="{ backgroundImage: profile.avatar ? `url(${profile.avatar})` : 'none' }"
            >
              <div v-if="!profile.avatar" class="w-full h-full flex items-center justify-center text-slate-400">
                <AppIcon>person</AppIcon>
              </div>
            </div>
            
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h5 class="font-bold text-slate-900 truncate">{{ profile.name }}</h5>
                <span 
                  class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter"
                  :class="profile.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'"
                >
                  {{ getRoleLabel(profile.role) }}
                </span>
              </div>
              <p class="text-[10px] text-slate-400 font-medium truncate">{{ profile.email }}</p>
            </div>

            <div class="text-right shrink-0">
              <div class="flex items-center gap-1 justify-end">
                <AppIcon name="database" fill class="text-amber-500" :size="12" />
                <span class="text-sm font-black text-slate-800">{{ profile.points }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Member Modals -->
    <MemberForm
      v-model:show="showAddModal"
      mode="add"
      :loading="isCreating"
      @submit="handleAddMember"
    />

    <MemberForm
      v-model:show="showEditModal"
      mode="edit"
      :profile="selectedProfile"
      :loading="isUpdating"
      @submit="handleUpdateMember"
      @reset-success="loadProfiles"
    />
  </div>
</template>

<style scoped>
.members-page {
  background-color: #f8fafc;
}
</style>
