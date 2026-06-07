<script setup lang="ts">
import { COLOR_OPTIONS } from '@/composables/useCalendarEditor'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
  showTabbar: false,
})

const {
  formData,
  isSaving,
  isDeleting,
  isInitializing,
  isEditMode,
  initEditor,
  saveEvent,
  deleteEvent,
  formatDisplayDate,
  formatDisplayTime,
} = useCalendarEditor()

onMounted(() => {
  initEditor()
})

const showStartDatePicker = ref(false)
const showStartTimePicker = ref(false)
const showEndDatePicker = ref(false)
const showEndTimePicker = ref(false)

const onStartDateConfirm = ({ selectedValues }: { selectedValues: string[] }) => {
  formData.value.startDate = selectedValues.join('-')
  showStartDatePicker.value = false
}

const onStartTimeConfirm = ({ selectedValues }: { selectedValues: string[] }) => {
  formData.value.startTime = selectedValues.join(':')
  showStartTimePicker.value = false
}

const onEndDateConfirm = ({ selectedValues }: { selectedValues: string[] }) => {
  formData.value.endDate = selectedValues.join('-')
  showEndDatePicker.value = false
}

const onEndTimeConfirm = ({ selectedValues }: { selectedValues: string[] }) => {
  formData.value.endTime = selectedValues.join(':')
  showEndTimePicker.value = false
}

const getDateColumns = (dateStr: string) => {
  if (!dateStr) return undefined
  return dateStr.split('-')
}

const getTimeColumns = (timeStr: string) => {
  if (!timeStr) return undefined
  return timeStr.split(':')
}
</script>

<template>
  <div class="min-h-screen editor-bg">
    <AppHeaderPage :title="isEditMode ? '編輯活動' : '新增活動'">
      <template #actions>
        <button
          @click="saveEvent"
          :disabled="isSaving || isDeleting || isInitializing"
          class="text-slate-900 text-sm font-bold tracking-widest active:opacity-70 active:scale-95 transition-all disabled:opacity-40"
        >
          {{ isSaving ? '儲存中...' : (isEditMode ? '更新' : '儲存') }}
        </button>
      </template>
    </AppHeaderPage>

    <main v-if="!isInitializing" class="px-4 pt-4 pb-24 space-y-5 max-w-md mx-auto">
      <div class="relative h-32 w-full rounded-2xl overflow-hidden shadow-sm">
        <div class="absolute inset-0 sky-hero-gradient"></div>
        <div class="absolute inset-0 bg-gradient-to-t from-[#F0F9FF]/80 to-transparent"></div>
      </div>

      <section class="glass-card rounded-2xl p-5 space-y-3">
        <label class="block text-[10px] font-bold tracking-widest uppercase text-slate-500">
          活動名稱 <span class="text-red-500 ml-1">*</span>
        </label>
        <input
          v-model="formData.title"
          type="text"
          maxlength="50"
          placeholder="請輸入活動名稱"
          class="w-full bg-transparent border-0 border-b border-slate-200 focus:ring-0 focus:border-[#2b9dee] text-lg font-bold placeholder:text-slate-300 placeholder:font-normal p-0 pb-2 outline-none"
        />
      </section>

      <section class="glass-card rounded-2xl p-2 space-y-1">
        <div class="flex items-center justify-between px-3 py-4">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-slate-400">schedule</span>
            <span class="font-medium text-slate-700">全天活動</span>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input v-model="formData.allDay" type="checkbox" class="sr-only peer" />
            <div class="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2b9dee]"></div>
          </label>
        </div>

        <div class="h-[1px] bg-white/30 mx-3"></div>

        <div class="flex items-center justify-between px-3 py-4">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-slate-400">calendar_today</span>
            <span class="text-sm font-medium text-slate-700">開始時間</span>
          </div>
          <div class="flex gap-2 text-sm">
            <button
              @click="showStartDatePicker = true"
              class="bg-white/40 px-2 py-1 rounded-lg text-[#2b9dee] hover:bg-white/60 transition-colors"
            >
              {{ formatDisplayDate(formData.startDate) }}
            </button>
            <button
              v-if="!formData.allDay"
              @click="showStartTimePicker = true"
              class="bg-white/40 px-2 py-1 rounded-lg text-[#2b9dee] hover:bg-white/60 transition-colors"
            >
              {{ formatDisplayTime(formData.startTime) }}
            </button>
          </div>
        </div>

        <div class="h-[1px] bg-white/30 mx-3"></div>

        <div class="flex items-center justify-between px-3 py-4">
          <div class="flex items-center gap-3">
            <span class="material-symbols-outlined text-slate-400">event</span>
            <span class="text-sm font-medium text-slate-700">結束時間</span>
          </div>
          <div class="flex gap-2 text-sm">
            <button
              @click="showEndDatePicker = true"
              class="bg-white/40 px-2 py-1 rounded-lg text-slate-500 hover:bg-white/60 transition-colors"
            >
              {{ formatDisplayDate(formData.endDate) }}
            </button>
            <button
              v-if="!formData.allDay"
              @click="showEndTimePicker = true"
              class="bg-white/40 px-2 py-1 rounded-lg text-slate-500 hover:bg-white/60 transition-colors"
            >
              {{ formatDisplayTime(formData.endTime) }}
            </button>
          </div>
        </div>
      </section>

      <section class="glass-card rounded-2xl p-2 space-y-1">
        <div class="flex items-start gap-3 px-3 py-4">
          <span class="material-symbols-outlined text-slate-400 mt-0.5">location_on</span>
          <input
            v-model="formData.location"
            type="text"
            placeholder="請輸入地點"
            class="flex-1 bg-transparent border-0 p-0 text-sm focus:ring-0 placeholder:text-slate-300 outline-none"
          />
        </div>
        <div class="h-[1px] bg-white/30 mx-3"></div>
        <div class="flex items-start gap-3 px-3 py-4">
          <span class="material-symbols-outlined text-slate-400 mt-1">notes</span>
          <textarea
            v-model="formData.description"
            placeholder="補充說明"
            rows="3"
            class="flex-1 bg-transparent border-0 p-0 text-sm focus:ring-0 placeholder:text-slate-300 resize-none outline-none"
          ></textarea>
        </div>
      </section>

      <section class="glass-card rounded-2xl p-2 space-y-1">
        <div class="flex items-center gap-3 px-3 py-4">
          <span class="material-symbols-outlined text-slate-400">visibility</span>
          <label class="text-sm font-medium text-slate-700 min-w-20">活動狀態</label>
          <select
            v-model="formData.status"
            class="flex-1 bg-transparent border-0 p-0 text-sm focus:ring-0 outline-none text-slate-700"
          >
            <option value="draft">草稿</option>
            <option value="published">發佈</option>
            <option value="closed">關閉</option>
          </select>
        </div>
        <p class="px-3 pb-3 text-[11px] leading-relaxed text-slate-500">
          草稿與已關閉活動僅管理員可見；已發佈活動會顯示在首頁與行事曆。
        </p>
        <div class="h-[1px] bg-white/30 mx-3"></div>
        <div class="flex items-start gap-3 px-3 py-4">
          <span class="material-symbols-outlined text-slate-400 mt-0.5">assignment</span>
          <input
            v-model="formData.googleFormUrl"
            type="url"
            required
            placeholder="Google 表單連結（必填）"
            class="flex-1 bg-transparent border-0 p-0 text-sm focus:ring-0 placeholder:text-slate-300 outline-none"
          />
        </div>
        <div class="h-[1px] bg-white/30 mx-3"></div>
        <div class="flex items-start gap-3 px-3 py-4">
          <span class="material-symbols-outlined text-slate-400 mt-0.5">table</span>
          <input
            v-model="formData.googleSheetId"
            type="text"
            placeholder="Google 試算表 ID"
            class="flex-1 bg-transparent border-0 p-0 text-sm focus:ring-0 placeholder:text-slate-300 outline-none"
          />
        </div>
        <div class="h-[1px] bg-white/30 mx-3"></div>
        <div class="flex items-start gap-3 px-3 py-4">
          <span class="material-symbols-outlined text-slate-400 mt-0.5">flag</span>
          <input
            v-model="formData.targetId"
            type="text"
            placeholder="Target ID"
            class="flex-1 bg-transparent border-0 p-0 text-sm focus:ring-0 placeholder:text-slate-300 outline-none"
          />
        </div>
        <div class="h-[1px] bg-white/30 mx-3"></div>
        <div class="flex items-start gap-3 px-3 py-4">
          <span class="material-symbols-outlined text-slate-400 mt-0.5">language</span>
          <input
            v-model="formData.subdomain"
            type="text"
            placeholder="活動子網域"
            class="flex-1 bg-transparent border-0 p-0 text-sm focus:ring-0 placeholder:text-slate-300 outline-none"
          />
        </div>
      </section>

      <section class="glass-card rounded-2xl p-2 space-y-1">
        <div class="flex items-center gap-3 px-3 py-4">
          <span class="material-symbols-outlined text-slate-400">how_to_reg</span>
          <label class="text-sm font-medium text-slate-700 flex-1">報名獎勵點數</label>
          <input
            v-model.number="formData.registrationBonus"
            type="number"
            min="0"
            class="w-20 bg-white/40 px-2 py-1 rounded-lg text-right text-sm text-[#2b9dee] outline-none"
          />
        </div>
        <div class="h-[1px] bg-white/30 mx-3"></div>
        <div class="flex items-center gap-3 px-3 py-4">
          <span class="material-symbols-outlined text-slate-400">fact_check</span>
          <label class="text-sm font-medium text-slate-700 flex-1">簽到獎勵點數</label>
          <input
            v-model.number="formData.checkinBonus"
            type="number"
            min="0"
            class="w-20 bg-white/40 px-2 py-1 rounded-lg text-right text-sm text-[#2b9dee] outline-none"
          />
        </div>
        <div class="h-[1px] bg-white/30 mx-3"></div>
        <div class="flex items-center gap-3 px-3 py-4">
          <span class="material-symbols-outlined text-slate-400">social_leaderboard</span>
          <label class="text-sm font-medium text-slate-700 flex-1">社群排行榜</label>
          <label class="relative inline-flex items-center cursor-pointer">
            <input v-model="formData.socialLeaderboard" type="checkbox" class="sr-only peer" />
            <div class="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2b9dee]"></div>
          </label>
        </div>
        <div class="h-[1px] bg-white/30 mx-3"></div>
        <div class="flex items-center gap-3 px-3 py-4">
          <span class="material-symbols-outlined text-slate-400">social_leaderboard</span>
          <label class="text-sm font-medium text-slate-700 flex-1">抽獎門檻 (點數)</label>
          <input
            v-model.number="formData.raffleThreshold"
            type="number"
            min="0"
            class="w-20 bg-white/40 px-2 py-1 rounded-lg text-right text-sm text-[#2b9dee] outline-none"
          />
        </div>
        <p class="px-3 pb-3 text-[11px] leading-relaxed text-slate-500">
          * 系統每分鐘自動結算點數，報名或簽到後請稍候。
        </p>
      </section>

      <section class="glass-card rounded-2xl p-5 space-y-4">
        <label class="block text-[10px] font-bold tracking-widest uppercase text-slate-500">
          活動顏色
        </label>
        <div class="flex justify-between items-center px-1">
          <button
            v-for="color in COLOR_OPTIONS"
            :key="color"
            @click="formData.color = color"
            class="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
            :class="formData.color === color ? 'ring-2 ring-offset-2' : ''"
            :style="{
              backgroundColor: color,
              '--tw-ring-color': formData.color === color ? color : 'transparent',
            }"
          >
            <span
              v-if="formData.color === color"
              class="material-symbols-outlined text-white text-lg"
              style="font-variation-settings: 'FILL' 1;"
            >
              check
            </span>
          </button>
        </div>
      </section>

      <section class="pt-4 space-y-3">
        <button
          @click="saveEvent"
          :disabled="isSaving || isDeleting || isInitializing"
          class="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#2b9dee] text-white font-bold text-sm shadow-lg shadow-blue-200 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <span class="material-symbols-outlined text-lg">done</span>
          {{ isSaving ? '處理中...' : (isEditMode ? '更新活動' : '建立活動') }}
        </button>

        <button
          v-if="isEditMode"
          @click="deleteEvent"
          :disabled="isDeleting || isSaving"
          class="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-50 text-red-500 font-bold text-sm active:bg-red-100 transition-colors disabled:opacity-50"
        >
          <span class="material-symbols-outlined text-lg">delete</span>
          {{ isDeleting ? '刪除中...' : '刪除活動' }}
        </button>
      </section>
    </main>

    <main v-else class="px-4 pt-16 pb-24 max-w-md mx-auto">
      <div class="glass-card rounded-2xl p-8 text-center text-slate-500">
        <span class="material-symbols-outlined text-3xl block mb-2 animate-spin opacity-50">progress_activity</span>
        載入活動中...
      </div>
    </main>

    <van-popup v-model:show="showStartDatePicker" position="bottom" round>
      <van-date-picker
        title="選擇開始日期"
        :model-value="getDateColumns(formData.startDate)"
        @confirm="onStartDateConfirm"
        @cancel="showStartDatePicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showStartTimePicker" position="bottom" round>
      <van-time-picker
        title="選擇開始時間"
        :model-value="getTimeColumns(formData.startTime)"
        @confirm="onStartTimeConfirm"
        @cancel="showStartTimePicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showEndDatePicker" position="bottom" round>
      <van-date-picker
        title="選擇結束日期"
        :model-value="getDateColumns(formData.endDate)"
        @confirm="onEndDateConfirm"
        @cancel="showEndDatePicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showEndTimePicker" position="bottom" round>
      <van-time-picker
        title="選擇結束時間"
        :model-value="getTimeColumns(formData.endTime)"
        @confirm="onEndTimeConfirm"
        @cancel="showEndTimePicker = false"
      />
    </van-popup>
  </div>
</template>

<style scoped>
.editor-bg {
  background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%);
}

.sky-hero-gradient {
  background: linear-gradient(135deg, #87CEEB 0%, #B0E0F6 40%, #E0F2FE 100%);
}

.glass-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
</style>
