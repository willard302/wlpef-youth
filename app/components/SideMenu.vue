<script setup lang="ts">
const props = defineProps<{
  show: boolean
  isAdmin: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'navigate-to-editor'): void
}>()

const router = useRouter()
const { handleLogout } = useUser()

const menuVisible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})

const menuItems = computed(() => [
  {
    id: 'add-event',
    label: '新增活動',
    icon: 'add_circle',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-600',
    hoverClass: 'hover:bg-sky-100',
    show: props.isAdmin,
    action: () => emit('navigate-to-editor'),
  },
  {
    id: 'registrations',
    label: '報名狀況',
    icon: 'group',
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-600',
    hoverClass: 'hover:bg-indigo-100',
    show: props.isAdmin,
    action: () => router.push('/home/registrations'),
  },
  {
    id: 'qr-code',
    label: '報到碼',
    icon: 'qr_code',
    bgClass: 'bg-green-50',
    textClass: 'text-green-600',
    hoverClass: 'hover:bg-green-100',
    show: true,
    action: () => router.push('/user-center/qr-code'),
  },
  {
    id: 'user-center',
    label: '會員中心',
    icon: 'account_circle',
    bgClass: 'bg-slate-50',
    textClass: 'text-slate-600',
    hoverClass: 'hover:bg-slate-100',
    show: true,
    action: () => router.push('/user-center'),
  },
  {
    id: 'logout',
    label: '登出帳號',
    icon: 'logout',
    bgClass: 'bg-red-50',
    textClass: 'text-red-600',
    hoverClass: 'hover:bg-red-100',
    show: true,
    action: handleLogout,
  },
])

const handleItemClick = (action: () => void) => {
  menuVisible.value = false
  action()
}
</script>

<template>
  <van-action-sheet v-model:show="menuVisible" class="rounded-t-[2.5rem] overflow-hidden">
    <template #default>
      <!-- Custom Header to replace the default one which has layout issues on some mobile devices -->
      <div class="px-6 py-5 flex items-center justify-between border-b border-slate-50">
        <h3 class="text-lg font-black text-slate-900">選單</h3>
        <button 
          @click="menuVisible = false"
          class="size-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 active:bg-slate-200 transition-colors"
        >
          <span class="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div class="px-6 pb-12 pt-6 space-y-3 menu-content">
        <template v-for="item in menuItems" :key="item.id">
          <button
            v-if="item.show"
            @click="handleItemClick(item.action)"
            class="w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all"
            :class="[item.bgClass, item.textClass, item.hoverClass]"
          >
            <div class="size-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <span class="material-symbols-outlined">{{ item.icon }}</span>
            </div>
            <span>{{ item.label }}</span>
          </button>
        </template>
      </div>
    </template>
  </van-action-sheet>
</template>

<style scoped>
.van-action-sheet {
  max-height: 80%;
}

.menu-content {
  /* Handle iPhone safe area (home indicator) */
  padding-bottom: calc(3rem + env(safe-area-inset-bottom));
}

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
}
</style>
