<script setup lang="ts">
const props = defineProps<{
  show: boolean
  canAddEvent: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'navigate-to-editor'): void
}>()

const router = useRouter()

const menuVisible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})

const handleNavigateToEditor = () => {
  menuVisible.value = false
  emit('navigate-to-editor')
}

const handleNavigateToUserCenter = () => {
  menuVisible.value = false
  router.push('/user-center')
}
</script>

<template>
  <van-action-sheet v-model:show="menuVisible" title="選單" class="rounded-t-[2.5rem] overflow-hidden">
    <div class="px-6 pb-12 pt-4 space-y-3">
      <button
        v-if="canAddEvent"
        @click="handleNavigateToEditor"
        class="w-full flex items-center gap-4 p-4 rounded-2xl bg-sky-50 text-sky-600 font-bold hover:bg-sky-100 transition-all"
      >
        <div class="size-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
          <span class="material-symbols-outlined">add_circle</span>
        </div>
        <span>新增活動</span>
      </button>

      <button
        @click="handleNavigateToUserCenter"
        class="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 text-slate-600 font-bold hover:bg-slate-100 transition-all"
      >
        <div class="size-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
          <span class="material-symbols-outlined">account_circle</span>
        </div>
        <span>會員中心</span>
      </button>
    </div>
  </van-action-sheet>
</template>

<style scoped>
.van-action-sheet {
  max-height: 80%;
}
</style>
