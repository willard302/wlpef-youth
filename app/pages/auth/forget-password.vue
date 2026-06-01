<script setup lang="ts">
import { ref } from 'vue'

definePageMeta({
  layout: 'auth'
})

const email = ref('')
const loading = ref(false)

const handleSendResetCode = async () => {
  if (!email.value) return
  // logic to send reset code
}
</script>

<template>
  <div class="relative flex h-screen w-full flex-col overflow-hidden bg-white font-display">
    
    <!-- Top Decoration -->
    <div class="absolute top-0 left-0 w-full h-1/3 bg-slate-50 flex items-center justify-center overflow-hidden">
      <div class="absolute -top-24 -left-24 size-64 rounded-full bg-primary/5 blur-3xl"></div>
      <div class="absolute -bottom-12 -right-12 size-48 rounded-full bg-primary/10 blur-2xl"></div>
      
      <!-- Placeholder for a simple illustration or icon -->
      <div class="relative z-10 flex flex-col items-center gap-4">
        <div class="size-20 rounded-3xl bg-white shadow-xl flex items-center justify-center text-primary">
          <span class="material-symbols-outlined text-5xl">lock_reset</span>
        </div>
        <h1 class="text-slate-900 text-2xl font-bold tracking-tight">
          忘記密碼
        </h1>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 mt-[33%] px-8 py-12 flex flex-col gap-10">
      <div class="space-y-2">
        <p class="text-slate-500 text-sm font-medium leading-relaxed">
          領袖會社青團<br/>
          請輸入您的電子郵件以重設密碼
        </p>
      </div>

      <div class="flex flex-col gap-6">
        <!-- Email Input -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
          <div class="bg-slate-50 rounded-2xl border border-slate-100 p-1 flex items-center transition-all focus-within:border-primary/30 focus-within:bg-white focus-within:shadow-sm">
            <span class="material-symbols-outlined text-slate-400 ml-3">mail</span>
            <input
              v-model="email"
              type="email"
              placeholder="輸入你的 Email" 
              class="w-full bg-transparent border-none text-slate-900 placeholder:text-slate-300 focus:ring-0 text-base py-3 px-3 outline-none"
            />
          </div>
        </div>

        <!-- Buttons -->
        <div class="flex flex-col gap-4">
          <button
            @click="handleSendResetCode"
            :disabled="!email || loading"
            class="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 text-lg tracking-wide hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            發送驗證碼
          </button>
          
          <button
            type="button"
            class="w-full py-4 text-slate-400 font-bold text-sm tracking-widest uppercase hover:text-slate-600 transition-colors"
          >
            聯繫社團管理員
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-auto">
        <NuxtLink 
          to="/auth/login" 
          class="flex items-center justify-center gap-2 text-primary font-bold"
        >
          <span class="material-symbols-outlined text-xl">arrow_back</span>
          <span>返回登入</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Background Pattern -->
    <div class="absolute bottom-0 right-0 p-8 opacity-5">
      <LogoIcon />
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
