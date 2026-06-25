<script setup lang="ts">
import type { CheckinScanResult } from '~/types';

const props = defineProps <{
  scanResult: CheckinScanResult
  scannedMemberId: string
}>()
</script>

<template>
  <div class="mt-6 rounded-3xl p-5 border-2" :class="scanResult.hasAnyPayment ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'">
    <div class="flex items-center gap-3 mb-4">
      <div class="size-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
        :class="scanResult.hasAnyPayment ? 'bg-emerald-500 shadow-emerald-200' : 'bg-rose-500 shadow-rose-200'">
        <AppIcon :name="scanResult.hasAnyPayment ? 'check_circle' : 'error'" />
      </div>
      <div>
        <p class="text-sm font-bold" :class="scanResult.hasAnyPayment ? 'text-emerald-800' : 'text-rose-800'">
          {{ scanResult.hasAnyPayment ? '繳費狀態正常' : '請提醒繳費' }}
        </p>
        <p class="text-xs font-medium" :class="scanResult.hasAnyPayment ? 'text-emerald-700' : 'text-rose-700'">
          {{ scanResult.paymentMessage }}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-2xl bg-white px-4 py-3 border"
        :class="scanResult.donationYear ? 'border-emerald-200' : 'border-slate-200'">
        <p class="text-[10px] font-bold text-slate-400 mb-1">年度捐贈</p>
        <p class="text-sm font-bold" :class="scanResult.donationYear ? 'text-emerald-600' : 'text-slate-500'">
          {{ scanResult.donationYear ? '已完成' : '未完成' }}
        </p>
      </div>
      <div class="rounded-2xl bg-white px-4 py-3 border"
        :class="scanResult.registrationFee ? 'border-emerald-200' : 'border-slate-200'">
        <p class="text-[10px] font-bold text-slate-400 mb-1">活動報名費</p>
        <p class="text-sm font-bold" :class="scanResult.registrationFee ? 'text-emerald-600' : 'text-slate-500'">
          {{ scanResult.registrationFee ? '已完成' : '未完成' }}
        </p>
      </div>
    </div>

    <p class="mt-4 text-xs font-medium" :class="scanResult.hasAnyPayment ? 'text-emerald-700' : 'text-rose-700'">
      會員 ID：{{ scannedMemberId }}
    </p>
  </div>
</template>

<style scoped></style>
