<script setup lang="ts">
import type { PrizeFormMode, PrizeFormPayload } from '~/types';

const show = defineModel<boolean>('show', { required: true })
const props = withDefaults(defineProps<PrizeFormMode>(), {
  mode: 'create',
  initialPrize: null,
})

const emit = defineEmits<{
  (e: 'submit', payload: PrizeFormPayload): void
}>()

const form = reactive<PrizeFormPayload>({
  prize: '',
  name: '',
  count: 1,
  drawOrder: 1,
})

watch(
  () => show.value,
  (isOpen) => {
    if (!isOpen) return
    form.prize = `${props.initialPrize?.prize ?? ''}`
    form.name = `${props.initialPrize?.name ?? ''}`
    form.count = Number(props.initialPrize?.count ?? 1)
    form.drawOrder = Number(props.initialPrize?.drawOrder ?? 1)
  }
)

const titleText = computed(() => props.mode === 'edit' ? '編輯獎項' : '新增獎項')
const submitText = computed(() => props.mode === 'edit' ? '更新' : '送出')

const submit = () => {
  emit('submit', {
    prize: form.prize,
    name: form.name,
    count: Number(form.count),
    drawOrder: Number(form.drawOrder),
  })
}
</script>

<template>
  <van-popup
    v-model:show="show"
    position="bottom"
    round
    :style="{ padding: '16px' }"
  >
    <div class="space-y-3">
      <h3 class="text-base font-bold text-slate-800">{{ titleText }}</h3>
      <van-field v-model="form.prize" label="獎項" placeholder="例如 頭獎" />
      <van-field v-model.number="form.drawOrder" type="number" label="抽獎序位" placeholder="例如 1" />
      <van-field v-model="form.name" label="獎品" placeholder="例如 星巴克禮券" />
      <van-field v-model.number="form.count" type="number" label="中獎人數" placeholder="例如 1" />
      <div class="flex items-center justify-end gap-2 pt-2">
        <van-button plain @click="show = false">取消</van-button>
        <van-button type="primary" @click="submit">{{ submitText }}</van-button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped></style>
