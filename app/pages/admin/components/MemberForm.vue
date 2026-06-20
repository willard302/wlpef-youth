<script setup lang="ts">
import type { ProfileRow, Role } from '~/types'

interface Props {
  show: boolean
  mode: 'add' | 'edit'
  profile?: ProfileRow | null
  loading?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:show': [value: boolean]
  'submit': [data: any]
  'reset-success': []
}>()

const { handleResetAccount } = useAdminUser()
const { addToast } = useToast()

const formData = ref({
  email: '',
  name: '',
  role: 'member' as Role,
  points: 0,
  scanPermission: false
})

const isResetting = ref(false)

watch(
  () => formData.value.role,
  (role) => {
    if (role === 'staff') {
      formData.value.scanPermission = true
    }
  }
)

// Sync internal state when profile or show changes
watch(() => props.show, (newVal) => {
  if (newVal) {
    if (props.mode === 'edit' && props.profile) {
      formData.value = {
        email: props.profile.email || '',
        name: props.profile.name,
        role: (props.profile.role as Role) || 'member',
        points: props.profile.points ?? 0,
        scanPermission: props.profile.scan_permission
      }
    } else {
      formData.value = {
        email: '',
        name: '',
        role: 'member',
        points: 0,
        scanPermission: false
      }
    }
  }
})

const handleSubmit = () => {
  emit('submit', { ...formData.value })
}

const handleClose = () => {
  emit('update:show', false)
}

const onReset = async () => {
  if (!props.profile?.id) return

  try {
    await showDialog({
      title: '刪除會員帳號',
      message: `確定要刪除 ${props.profile.name} 的帳號嗎？這將會刪除其個人資料、點數紀錄，並將報名狀態重置。此操作無法復原。`,
      showCancelButton: true,
      confirmButtonText: '確定刪除',
      confirmButtonColor: '#ef4444',
      cancelButtonText: '取消'
    })

    isResetting.value = true
    await handleResetAccount(props.profile.id)
    addToast('帳號已成功重置', 'success')
    emit('update:show', false)
    emit('reset-success')
  } catch (err) {
    if (err !== 'cancel' && err) {
      addToast('重置帳號失敗', 'error')
    }
  } finally {
    isResetting.value = false
  }
}
</script>

<template>
  <van-action-sheet
    :show="show"
    @update:show="handleClose"
    :title="mode === 'edit' ? '編輯會員資料' : '新增會員'"
    class="rounded-t-[2.5rem]"
  >
    <div class="px-6 pb-12 pt-4 space-y-6">
      <div v-if="mode === 'edit' && profile" class="flex items-center gap-4 mb-2">
        <div
          class="size-16 rounded-2xl bg-slate-100 bg-cover bg-center shadow-inner"
          :style="{ backgroundImage: profile.avatar_url ? `url(${profile.avatar_url})` : 'none' }"
        >
          <div v-if="!profile.avatar_url" class="w-full h-full flex items-center justify-center text-slate-300">
            <AppIcon name="person" :size="30" />
          </div>
        </div>
        <div>
          <h3 class="text-lg font-bold text-slate-900">{{ profile.name }}</h3>
          <p class="text-xs text-slate-500 font-medium">{{ profile.email }}</p>
        </div>
      </div>

      <div class="space-y-4">
        <FormField v-if="mode === 'add'" label="電子郵件" required>
          <input
            v-model="formData.email"
            type="email"
            placeholder="example@gmail.com"
            class="w-full h-12 px-4 bg-slate-50 rounded-2xl border-none outline-none text-sm focus:ring-2 focus:ring-sky-500/20"
          />
        </FormField>

        <FormField label="姓名" :required="mode === 'add'">
          <input
            v-model="formData.name"
            type="text"
            placeholder="請輸入真實姓名"
            class="w-full h-12 px-4 bg-slate-50 rounded-2xl border-none outline-none text-sm focus:ring-2 focus:ring-sky-500/20"
          />
        </FormField>

        <div class="grid grid-cols-2 gap-4">
          <FormField label="身分角色">
            <select
              v-model="formData.role"
              class="w-full h-12 px-4 bg-slate-50 rounded-2xl border-none outline-none text-sm focus:ring-2 focus:ring-sky-500/20 appearance-none"
            >
              <option value="member">一般成員</option>
              <option value="staff">工作人員</option>
              <option value="admin">管理員</option>
            </select>
          </FormField>
          <FormField :label="mode === 'edit' ? '剩餘點數' : '初始點數'">
            <input
              v-model.number="formData.points"
              type="number"
              class="w-full h-12 px-4 bg-slate-50 rounded-2xl border-none outline-none text-sm focus:ring-2 focus:ring-sky-500/20"
            />
          </FormField>
        </div>

        <!-- Scanner Permission Toggle -->
        <div class="flex items-center justify-between px-4 py-4 bg-slate-50 rounded-2xl">
          <div class="flex items-center gap-3">
            <AppIcon name="qr_code_scanner" class="text-slate-400" />
            <div class="flex flex-col">
              <span class="text-sm font-medium text-slate-700">簽到掃描權限</span>
              <span class="text-[10px] text-slate-400">開通後該用戶可協助活動簽到</span>
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input v-model="formData.scanPermission" type="checkbox" class="sr-only peer" />
            <div class="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
          </label>
        </div>
      </div>

      <div class="space-y-3">
        <button
          @click="handleSubmit"
          :disabled="loading || isResetting"
          class="w-full h-14 bg-sky-500 text-white rounded-2xl font-bold shadow-lg shadow-sky-100 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          <span v-if="loading" class="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <AppIcon v-else :name="mode === 'edit' ? 'save' : 'send'" :size="18" />
          <span>{{ loading ? '處理中...' : (mode === 'edit' ? '儲存變更' : '建立並發送邀請') }}</span>
        </button>

        <button
          v-if="mode === 'edit'"
          @click="onReset"
          :disabled="loading || isResetting"
          class="w-full h-12 bg-white text-red-500 border border-red-100 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          <span v-if="isResetting" class="size-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></span>
          <AppIcon v-else name="delete_forever" :size="18" />
          <span>刪除帳號</span>
        </button>
      </div>
    </div>
  </van-action-sheet>
</template>

<style scoped></style>
