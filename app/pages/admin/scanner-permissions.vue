<script setup lang="ts">
import type { Database } from '@/types/database.types'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
  showTabbar: false,
})

type MemberScannerPermission = {
  id: string
  name: string
  email: string | null
  scanPermission: boolean
}

const supabase = useSupabaseClient<Database>()
const { addToast } = useToast()

const members = ref<MemberScannerPermission[]>([])
const isLoading = ref(true)
const searchQuery = ref('')
const updatingIds = ref<Set<string>>(new Set())

const loadMembers = async () => {
  try {
    isLoading.value = true
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, scan_permission, role')
      .eq('role', 'member')
      .order('name', { ascending: true })

    if (error) throw error

    members.value = (data || []).map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      scanPermission: member.scan_permission ?? false,
    }))
  } catch (err: any) {
    addToast(err.message || '載入會員資料失敗', 'error')
  } finally {
    isLoading.value = false
  }
}

const filteredMembers = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  if (!keyword) return members.value

  return members.value.filter(member => {
    return (
      member.name.toLowerCase().includes(keyword) ||
      (member.email || '').toLowerCase().includes(keyword)
    )
  })
})

const updateScannerPermission = async (member: MemberScannerPermission, enabled: boolean) => {
  const nextUpdatingIds = new Set(updatingIds.value)
  nextUpdatingIds.add(member.id)
  updatingIds.value = nextUpdatingIds

  const previousValue = member.scanPermission
  member.scanPermission = enabled

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ scan_permission: enabled })
      .eq('id', member.id)

    if (error) throw error

    addToast(
      enabled ? `已開通 ${member.name} 的掃描權限` : `已關閉 ${member.name} 的掃描權限`,
      'success'
    )
  } catch (err: any) {
    member.scanPermission = previousValue
    addToast(err.message || '更新權限失敗', 'error')
  } finally {
    const resetUpdatingIds = new Set(updatingIds.value)
    resetUpdatingIds.delete(member.id)
    updatingIds.value = resetUpdatingIds
  }
}

onMounted(() => {
  loadMembers()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20">
    <AppHeaderPage title="掃描權限管理" show-back />

    <main class="px-4 pt-6 space-y-4">
      <section class="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <p class="text-xs text-slate-500 mb-3">由管理員開通後，會員會在首頁看到「簽到掃描」功能。</p>
        <div class="relative">
          <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋姓名或 Email"
            class="w-full h-12 pl-12 pr-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-sky-400 outline-none text-sm"
          />
        </div>
      </section>

      <section class="space-y-3">
        <div v-if="isLoading" class="py-12 flex justify-center">
          <div class="size-7 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div v-else-if="filteredMembers.length === 0" class="bg-white rounded-3xl p-8 text-center text-slate-400 border border-slate-100">
          查無符合條件的會員
        </div>

        <div
          v-else
          v-for="member in filteredMembers"
          :key="member.id"
          class="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm"
        >
          <div class="flex items-center justify-between gap-4">
            <div class="min-w-0">
              <h3 class="font-bold text-slate-800 truncate">{{ member.name }}</h3>
              <p class="text-xs text-slate-500 truncate">{{ member.email || '未提供 Email' }}</p>
            </div>

            <button
              type="button"
              :disabled="updatingIds.has(member.id)"
              @click="updateScannerPermission(member, !member.scanPermission)"
              class="h-10 px-4 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              :class="member.scanPermission ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'"
            >
              {{ member.scanPermission ? '已開通' : '未開通' }}
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>