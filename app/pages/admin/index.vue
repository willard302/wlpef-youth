<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
  showTabbar: true,
  tabbarKey: 'home'
})

const { userProfile } = useUser()
const { openMenu } = useSideMenu()

const stats = ref([
  { label: '活動總數', value: '12', icon: 'calendar_month', color: 'text-blue-500', bg: 'bg-blue-50' },
  { label: '累積會員', value: '128', icon: 'group', color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { label: '本月報名', value: '45', icon: 'how_to_reg', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { label: '點數發放', value: '2.5k', icon: 'database', color: 'text-amber-500', bg: 'bg-amber-50' },
])

const quickActions = [
  { label: '新增活動', icon: 'add_circle', path: '/admin/event-editor', color: 'bg-sky-500' },
  { label: '報名管理', icon: 'assignment_ind', path: '/admin/registrations', color: 'bg-indigo-500' },
  { label: '活動簽到', icon: 'qr_code_scanner', path: '/admin/checkin', color: 'bg-emerald-500' },
  { label: '點數紀錄', icon: 'history', path: '/admin/points-history', color: 'bg-amber-500' },
]
</script>

<template>
  <div class="admin-dashboard pb-24">
    <AppHeaderHero
      eyebrow="管理後台"
      title="管理中心"
      height-class="h-48"
    >
      <template #actions>
        <button
          @click="openMenu"
          class="size-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-all"
        >
          <span class="material-symbols-outlined text-2xl">menu</span>
        </button>
      </template>
      <p class="text-sky-100 text-sm font-medium opacity-90">歡迎回來，{{ userProfile?.name }}。今天想處理什麼？</p>
    </AppHeaderHero>

    <main class="px-4 -mt-8 relative z-20 space-y-6">
      <!-- Quick Stats Grid -->
      <section class="grid grid-cols-2 gap-4">
        <div 
          v-for="stat in stats" 
          :key="stat.label"
          class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-3"
        >
          <div :class="[stat.bg, stat.color, 'size-10 rounded-2xl flex items-center justify-center']">
            <span class="material-symbols-outlined text-2xl">{{ stat.icon }}</span>
          </div>
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ stat.label }}</p>
            <p class="text-2xl font-black text-slate-800">{{ stat.value }}</p>
          </div>
        </div>
      </section>

      <!-- Quick Actions -->
      <section class="space-y-4">
        <h3 class="px-2 text-sm font-bold text-slate-500 uppercase tracking-widest">快速功能</h3>
        <div class="grid grid-cols-4 gap-2">
          <NuxtLink
            v-for="action in quickActions"
            :key="action.label"
            :to="action.path"
            class="flex flex-col items-center gap-2"
          >
            <div :class="[action.color, 'size-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-100 active:scale-95 transition-transform']">
              <span class="material-symbols-outlined text-2xl">{{ action.icon }}</span>
            </div>
            <span class="text-[10px] font-bold text-slate-600">{{ action.label }}</span>
          </NuxtLink>
        </div>
      </section>

      <!-- Recent System Logs Placeholder -->
      <section class="space-y-4">
        <div class="flex items-center justify-between px-2">
          <h3 class="text-sm font-bold text-slate-500 uppercase tracking-widest">近期異動</h3>
        </div>
        <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center text-center py-12">
          <span class="material-symbols-outlined text-4xl text-slate-200 mb-2">history</span>
          <p class="text-slate-400 text-sm font-medium">尚無近期異動紀錄</p>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.admin-dashboard {
  background-color: #f8fafc;
  min-height: 100vh;
}
</style>
