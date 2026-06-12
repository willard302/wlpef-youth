<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const route = useRoute()
const email = ref(route.query.email as string || '')
</script>

<template>
  <div class="flex flex-col items-center justify-center flex-1 px-8 text-center">
    <div class="w-full max-w-sm glass-effect rounded-[2.5rem] p-10 shadow-2xl space-y-8 border border-white/20 bg-white/10 backdrop-blur-xl animate-fade-in">
      <div class="size-24 rounded-3xl bg-green-500/20 flex items-center justify-center mx-auto text-green-500">
        <span class="material-symbols-outlined text-5xl">mark_email_read</span>
      </div>

      <div class="space-y-3">
        <h1 class="text-white text-2xl font-bold tracking-tight">
          註冊成功！
        </h1>
        <p class="text-white/70 leading-relaxed">
          驗證信件已發送至：<br />
          <span class="text-white font-medium">{{ email }}</span>
        </p>
        <p class="text-white/60 text-sm">
          請前往您的電子郵件信箱點擊驗證連結，以完成帳號啟用。
        </p>
      </div>

      <div class="pt-4 flex flex-col gap-4">
        <van-button
          to="/auth"
          block
          class="!h-12 !rounded-xl !bg-primary !text-white !font-bold !border-none"
        >
          返回登入
        </van-button>
        
        <p class="text-xs text-white/40">
          沒收到信件？請檢查垃圾郵件匣<br />或稍候片刻。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.6s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
