<script setup lang="ts">
import MemberForm from './components/MemberForm.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const { 
  isLoading,
  profiles,
  isCreating,
  isUpdating,
  showAddModal,
  showEditModal,
  selectedProfile,
  searchQuery,
  currentPage,
  itemsPerPage,
  filteredProfiles,
  paginatedProfiles,
  loadProfiles,
  handleAddMember,
  handleUpdateMember,
  openEditModal,

} = useAdminMembers()


onMounted(async () => {
  await loadProfiles()
})
</script>

<template>
  <div class="members-page pb-24 min-h-screen bg-slate-50">
    <AppHeaderPage title="會員管理" />

    <main class="px-4 mt-4 relative z-20 space-y-6">

      <!-- Member Stats -->
      <div v-if="!isLoading" class="grid grid-cols-2 gap-4">
        <div class="stat-card">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">總會員數</p>
          <p class="text-2xl font-black text-slate-800">{{ profiles.length }}</p>
        </div>
        <div class="stat-card">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">管理員</p>
          <p class="text-2xl font-black text-indigo-500">
            {{ profiles.filter(p => p.role === 'admin').length }}
          </p>
        </div>
      </div>

      <AppSearchBar
        v-model="searchQuery"
        placeholder="搜尋姓名、Email..."
      >
        <template #right-icon>
          <button
            @click="showAddModal = true"
            class="size-12 bg-sky-500 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <AppIcon name="person_add" />
          </button>
        </template>
      </AppSearchBar>

      <!-- Member List -->
      <section class="space-y-4">
        <div class="flex items-center justify-between px-2">
          <h4 class="text-sm font-bold text-slate-500 uppercase tracking-widest">會員清單</h4>
        </div>

        <AppLoading v-if="isLoading && profiles.length === 0" />

        <div v-else-if="filteredProfiles.length === 0" class="bg-white/50 border-2 border-dashed border-slate-200 rounded-[2rem] py-12 flex flex-col items-center justify-center text-center">
          <AppIcon name="group_off" :size="36" class="text-slate-200 mb-2" />
          <p class="text-slate-400 text-sm font-medium">尚無符合條件的會員</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="profile in paginatedProfiles"
            :key="profile.id"
            @click="openEditModal(profile)"
            class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer"
          >
            <div
              class="size-12 rounded-2xl bg-slate-100 bg-cover bg-center shrink-0"
              :style="{ backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : 'none' }"
            >
              <div v-if="!profile.avatar_url" class="w-full h-full flex items-center justify-center text-slate-400">
                <AppIcon name="person" />
              </div>
            </div>
            
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h5 class="font-bold text-slate-900 truncate">{{ profile.name }}</h5>
                <span 
                  class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter"
                  :class="profile.role === 'admin'
                    ? 'bg-indigo-100 text-indigo-600'
                    : profile.role === 'staff'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-500'"
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

          <div v-if="filteredProfiles.length > itemsPerPage" class="pt-4 pb-8">
            <van-pagination 
              v-model="currentPage"
              :total-items="filteredProfiles.length"
              :items-per-page="itemsPerPage"
              force-ellipses
              class="custom-pagination"
            >
              <template #prev-text>
                <AppIcon name="chevron_left" :size="16" />
              </template>
              <template #next-text>
                <AppIcon name="chevron_right" :size="16" />
              </template>
            </van-pagination>
          </div>
        </div>
      </section>
    </main>

    <!-- Member Modals -->
    <AdminMemberForm
      v-model:show="showAddModal"
      mode="add"
      :loading="isCreating"
      @submit="handleAddMember"
    />

    <AdminMemberForm
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
