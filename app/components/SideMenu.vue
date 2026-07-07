<script setup lang="ts">
import type { MenuAction, MenuItem } from '~/types';

const props = defineProps<{
  show: boolean
  isAdmin: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const router = useRouter()
const { handleLogout, userProfile } = useUser()

const menuVisible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})

const menuItems = computed<MenuItem[]>(() => {
  const adminItems: MenuItem[] = [
    {
      id: 'events',
      label: '活動管理',
      icon: 'edit_calendar',
      bgClass: 'bg-sky-50',
      textClass: 'text-sky-600',
      hoverClass: 'hover:bg-sky-100',
      visible: true,
      action: () => {
        void router.push('/admin/events')
      },
    },
    {
      id: 'registrations',
      label: '報名狀況',
      icon: 'assignment_ind',
      bgClass: 'bg-indigo-50',
      textClass: 'text-indigo-600',
      hoverClass: 'hover:bg-indigo-100',
      visible: true,
      action: () => {
        void router.push('/admin/registrations')
      },
    },
    {
      id: 'attendance',
      label: '活動出席',
      icon: 'verified',
      bgClass: 'bg-teal-50',
      textClass: 'text-teal-600',
      hoverClass: 'hover:bg-teal-100',
      visible: true,
      action: () => {
        void router.push('/admin/attendance')
      },
    },
    {
      id: 'members',
      label: '會員管理',
      icon: 'group',
      bgClass: 'bg-violet-50',
      textClass: 'text-violet-600',
      hoverClass: 'hover:bg-violet-100',
      visible: true,
      action: () => {
        void router.push('/admin/members')
      },
    },
    {
      id: 'points-history-admin',
      label: '點數紀錄',
      icon: 'history',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-600',
      hoverClass: 'hover:bg-amber-100',
      visible: true,
      action: () => {
        void router.push('/admin/points-history')
      },
    },
    {
      id: 'checkin-admin',
      label: '活動簽到',
      icon: 'qr_code_scanner',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-600',
      hoverClass: 'hover:bg-emerald-100',
      visible: true,
      action: () => {
        void router.push('/admin/checkin')
      },
    }
  ]

  const memberItems: MenuItem[] = [
    {
      id: 'home',
      label: '首頁',
      icon: 'home',
      bgClass: 'bg-slate-50',
      textClass: 'text-slate-600',
      hoverClass: 'hover:bg-slate-100',
      visible: true,
      action: () => {
        void router.push('/home')
      },
    },
    {
      id: 'events',
      label: '活動中心',
      icon: 'event',
      bgClass: 'bg-sky-50',
      textClass: 'text-sky-600',
      hoverClass: 'hover:bg-sky-100',
      visible: true,
      action: () => {
        void router.push('/events')
      },
    },
    {
      id: 'points-history',
      label: '點數紀錄',
      icon: 'history',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-600',
      hoverClass: 'hover:bg-amber-100',
      visible: true,
      action: () => {
        void router.push('/points-history')
      },
    },
  ]

  const canUseScanner =
    userProfile.value?.role === 'admin' ||
    userProfile.value?.role === 'staff' ||
    userProfile.value?.role === 'raffle_staff'

  const canManageRaffle =
    userProfile.value?.role === 'admin' ||
    userProfile.value?.role === 'raffle_staff'

  if (canUseScanner) {
    memberItems.unshift({
      id: 'checkin-member',
      label: '活動簽到',
      icon: 'qr_code_scanner',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-600',
      hoverClass: 'hover:bg-emerald-100',
      visible: true,
      action: () => {
        void router.push('/admin/checkin')
      },
    })
  }

  if (canManageRaffle) {
    memberItems.unshift({
      id: 'raffle-member',
      label: '抽獎設置',
      icon: 'casino',
      bgClass: 'bg-rose-50',
      textClass: 'text-rose-600',
      hoverClass: 'hover:bg-rose-100',
      visible: true,
      action: () => {
        void router.push('/admin/raffle')
      },
    })
  }

  return [
    ...(props.isAdmin ? adminItems : memberItems),
    {
      id: 'logout',
      label: '登出帳號',
      icon: 'logout',
      bgClass: 'bg-red-50',
      textClass: 'text-red-600',
      hoverClass: 'hover:bg-red-100',
      visible: true,
      action: () => {
        void handleLogout()
      },
    },
  ]
})

const handleItemClick = (action: MenuAction) => {
  menuVisible.value = false
  void action()
}
</script>

<template>
  <van-action-sheet v-model:show="menuVisible" title="選單">
    <div class="px-6 pb-12 pt-6 space-y-3 menu-content">
      <button
        v-for="item in menuItems"
        :key="item.id"
        type="button"
        class="w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all"
        :class="[item.bgClass, item.textClass, item.hoverClass]"
        @click="handleItemClick(item.action)"
      >
        <div class="size-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
          <AppIcon :name="item.icon" :weight="500" />
        </div>
        <span>{{ item.label }}</span>
      </button>
    </div>
  </van-action-sheet>
</template>

<style scoped>
.menu-content {
  /* Handle iPhone safe area (home indicator) */
  padding-bottom: calc(3rem + env(safe-area-inset-bottom));
}
</style>
