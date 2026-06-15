<script setup lang="ts">
import QrcodeVue from 'qrcode.vue'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const directions: {text: string}[] = [
  { text: "請於活動報到處主動出示此 QR Code。" },
  { text: "工作人員掃描成功後，系統將自動記錄參與。" },
  { text: "若無法掃描，請提供報名時使用的 Email。" }
]

const isVisible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const { userProfile, loadUserData, isLoading } = useUser()

onMounted(async () => {
  if (!userProfile.value) {
    await loadUserData()
  }
})

const qrValue = computed(() => userProfile.value?.id || '')
</script>

<template>
  <van-action-sheet v-model:show="isVisible">
    <div class="px-6 pt-6 pb-10 bg-slate-50 min-h-[500px]">
      <div class="text-center mb-8">
        <h3 class="text-xl font-bold text-slate-900">我的 QR Code</h3>
        <p class="text-sm text-slate-500 mt-1">出示此碼以完成活動報到</p>
      </div>

      <div v-if="isLoading" class="flex flex-col items-center justify-center py-10">
        <div class="size-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-slate-500 text-sm font-medium">載入中...</p>
      </div>

      <div v-else-if="userProfile" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <!-- QR Code Section -->
        <div class="p-6 bg-white rounded-[2.5rem] shadow-xl shadow-sky-100/50 border border-white text-center mx-auto w-[260px]">
          <qrcode-vue
            :value="qrValue"
            :size="200"
            level="H"
            render-as="svg"
            class="mx-auto"
            :margin="2"
          />
          <div class="mt-4 flex items-center justify-center gap-2 text-slate-400">
            <AppIcon name="verified_user" :size="14" />
            <span class="text-[11px] font-bold uppercase tracking-wider">{{ userProfile.name }}</span>
          </div>
        </div>

        <div class="bg-white/60 backdrop-blur-sm rounded-[2rem] p-6 border border-white shadow-sm">
          <h3 class="text-slate-800 font-bold text-sm mb-4 flex items-center gap-2">
            <AppIcon name="info" class="text-sky-500" />
            報到說明
          </h3>
          <ul class="space-y-3">
            <li v-for="(direct, idx) in directions" :key="idx" class="flex gap-3 items-start">
              <span class="size-5 rounded-full bg-sky-100 text-sky-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{{ idx + 1 }}</span>
              <span class="text-xs text-slate-600 leading-relaxed font-medium">{{ direct.text }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </van-action-sheet>
</template>
