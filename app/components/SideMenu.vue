<script setup lang="ts">
import type { MenuConfigItem } from '~/types';
import { ADMIN_MENU_ITEMS, LOGOUT_ITEM, MEMBER_MENU_ITEMS } from '~/config/menu';

const props = defineProps<{
  show: boolean
  isAdmin: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const { handleLogout, userProfile } = useUser()

const router = useRouter()

const menuVisible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})

const menuItems = computed<MenuConfigItem[]>(() => {
  if (props.isAdmin) return [ ...ADMIN_MENU_ITEMS, LOGOUT_ITEM ]

  const userRole = userProfile.value?.role || ''

  const filteredMembers = MEMBER_MENU_ITEMS.filter(item => {
    if(!item.roles) return true
    return item.roles.includes(userRole)
  })

  return [...filteredMembers, LOGOUT_ITEM]
})

const handleItemClick = (item: MenuConfigItem) => {
  menuVisible.value = false
  
  if (item.actionType === 'logout') {
    void handleLogout()
  } else if (item.to) {
    void router.push(item.to)
  }
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
        @click="handleItemClick(item)"
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
