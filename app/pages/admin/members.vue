<script setup lang="ts">
import { format as fnsFormat } from 'date-fns'
import { userService } from '@/services/userService'
import type { UserProfile, Role } from '@/types'

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

const showAddModal = ref(false)
const newMember = ref({
  email: '',
  name: '',
  role: 'member' as Role,
  points: 0,
  department: ''
})

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

const handleAddMember = async () => {
  if (!newMember.value.email || !newMember.value.name) {
    addToast('請填寫 Email 與姓名', 'error')
    return
  }

  isCreating.value = true
  try {
    await userService.adminCreateMember(newMember.value)
    addToast('會員建立成功並已發送邀請', 'success')
    showAddModal.value = false
    // 重置表單
    newMember.value = {
      email: '',
      name: '',
      role: 'member',
      points: 0,
      department: ''
    }
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
      profile.email.toLowerCase().includes(keyword) ||
      profile.department.toLowerCase().includes(keyword)
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
          <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋姓名、Email、部門..."
            class="w-full h-12 pl-12 pr-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-primary/50 outline-none text-sm"
          />
        </div>
        <button
          @click="showAddModal = true"
          class="size-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <span class="material-symbols-outlined">person_add</span>
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
          <span class="material-symbols-outlined text-4xl text-slate-200 mb-2">group_off</span>
          <p class="text-slate-400 text-sm font-medium">尚無符合條件的會員</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="profile in filteredProfiles"
            :key="profile.id"
            class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4"
          >
            <div
              class="size-12 rounded-2xl bg-slate-100 bg-cover bg-center shrink-0"
              :style="{ backgroundImage: profile.avatar ? `url(${profile.avatar})` : 'none' }"
            >
              <div v-if="!profile.avatar" class="w-full h-full flex items-center justify-center text-slate-400">
                <span class="material-symbols-outlined">person</span>
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
                <span class="material-symbols-outlined text-amber-500 text-xs font-variation-settings-fill-1">database</span>
                <span class="text-sm font-black text-slate-800">{{ profile.points }}</span>
              </div>
              <p v-if="profile.department" class="text-[9px] font-bold text-slate-400">{{ profile.department }}</p>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Add Member Modal -->
    <van-action-sheet v-model:show="showAddModal" title="新增會員" class="rounded-t-[2.5rem]">
      <div class="px-6 pb-12 pt-4 space-y-6">
        <div class="space-y-4">
          <FormField label="電子郵件" required>
            <input
              v-model="newMember.email"
              type="email"
              placeholder="example@gmail.com"
              class="w-full h-12 px-4 bg-slate-50 rounded-2xl border-none outline-none text-sm focus:ring-2 focus:ring-sky-500/20"
            />
          </FormField>

          <FormField label="姓名" required>
            <input
              v-model="newMember.name"
              type="text"
              placeholder="請輸入真實姓名"
              class="w-full h-12 px-4 bg-slate-50 rounded-2xl border-none outline-none text-sm focus:ring-2 focus:ring-sky-500/20"
            />
          </FormField>

          <div class="grid grid-cols-2 gap-4">
            <FormField label="身分角色">
              <select
                v-model="newMember.role"
                class="w-full h-12 px-4 bg-slate-50 rounded-2xl border-none outline-none text-sm focus:ring-2 focus:ring-sky-500/20 appearance-none"
              >
                <option value="member">一般成員</option>
                <option value="admin">管理員</option>
              </select>
            </FormField>
            <FormField label="初始點數">
              <input
                v-model.number="newMember.points"
                type="number"
                class="w-full h-12 px-4 bg-slate-50 rounded-2xl border-none outline-none text-sm focus:ring-2 focus:ring-sky-500/20"
              />
            </FormField>
          </div>

          <FormField label="部門 / 小組">
            <input
              v-model="newMember.department"
              type="text"
              placeholder="例如：青年部"
              class="w-full h-12 px-4 bg-slate-50 rounded-2xl border-none outline-none text-sm focus:ring-2 focus:ring-sky-500/20"
            />
          </FormField>
        </div>

        <button
          @click="handleAddMember"
          :disabled="isCreating"
          class="w-full h-14 bg-sky-500 text-white rounded-2xl font-bold shadow-lg shadow-sky-100 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          <span v-if="isCreating" class="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>{{ isCreating ? '建立中...' : '建立並發送邀請' }}</span>
        </button>
      </div>
    </van-action-sheet>
  </div>
</template>

<style scoped>
.members-page {
  background-color: #f8fafc;
}
.font-variation-settings-fill-1 {
  font-variation-settings: 'FILL' 1;
}
</style>
