<script setup lang="ts">
import type { UserProfile, Role } from '@/types'

interface Props {
  show: boolean
  mode: 'add' | 'edit'
  profile?: UserProfile | null
  loading?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:show': [value: boolean]
  'submit': [data: any]
}>()

const formData = ref({
  email: '',
  name: '',
  role: 'member' as Role,
  points: 0,
  scanPermission: false
})

// Sync internal state when profile or show changes
watch(() => props.show, (newVal) => {
  if (newVal) {
    if (props.mode === 'edit' && props.profile) {
      formData.value = {
        email: props.profile.email,
        name: props.profile.name,
        role: props.profile.role,
        points: props.profile.points,
        scanPermission: props.profile.scanPermission
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
          :style="{ backgroundImage: profile.avatar ? `url(${profile.avatar})` : 'none' }"
        >
          <div v-if="!profile.avatar" class="w-full h-full flex items-center justify-center text-slate-300">
            <span class="material-symbols-outlined text-3xl">person</span>
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
            <span class="material-symbols-outlined text-slate-400">qr_code_scanner</span>
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

      <button
        @click="handleSubmit"
        :disabled="loading"
        class="w-full h-14 bg-sky-500 text-white rounded-2xl font-bold shadow-lg shadow-sky-100 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
      >
        <span v-if="loading" class="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        <span>{{ loading ? '處理中...' : (mode === 'edit' ? '儲存變更' : '建立並發送邀請') }}</span>
      </button>
    </div>
  </van-action-sheet>
</template>

<style scoped></style>
