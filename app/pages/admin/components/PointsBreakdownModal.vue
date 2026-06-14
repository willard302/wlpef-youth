<script setup lang="ts">
const props = defineProps<{
  show: boolean,
  eventId: string,
  stats: {
    totalPoints: number,
    pointsBreakdown: {
      registration: number,
      checkin: number
    }
  }
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const pointsBreakdownVisible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})
</script>

<template>
  <van-action-sheet v-model:show="pointsBreakdownVisible" title="點數發放詳情" class="rounded-t-[2.5rem]">
    <div class="px-6 pb-12 pt-6 space-y-6">
      <div class="text-center space-y-1">
        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">活動總發放</p>
        <p class="text-4xl font-black text-amber-500 tracking-tighter">{{ stats.totalPoints }} <span class="text-sm font-bold text-slate-400">PTS</span></p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="bg-slate-50 rounded-3xl p-5 space-y-2">
          <div class="size-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <AppIcon :size="18">how_to_reg</AppIcon>
          </div>
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">報名獎勵</p>
            <p class="text-xl font-black text-slate-800">{{ stats.pointsBreakdown.registration }}</p>
          </div>
        </div>
        <div class="bg-slate-50 rounded-3xl p-5 space-y-2">
          <div class="size-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <AppIcon :size="18">check_circle</AppIcon>
          </div>
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">簽到獎勵</p>
            <p class="text-xl font-black text-slate-800">{{ stats.pointsBreakdown.checkin }}</p>
          </div>
        </div>
      </div>

      <p v-if="props.eventId" class="text-[10px] text-center text-slate-400 font-medium">
        * 僅顯示該活動（ID: {{ props.eventId.substring(0, 8) }}...）相關的點數發放
      </p>
    </div>
  </van-action-sheet>
</template>

<style scoped></style>
