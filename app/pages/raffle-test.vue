<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
  showTabbar: false,
})

const {
  active,
  currentRound,
  myWinningRounds,
  lastError,
  polling,
  lastResponse,
  myId,
  poll,
} = useRaffleNotice({
  onWin(rounds) {
    void showDialog({
      title: '🎉 恭喜中獎！',
      message: `你在第 ${rounds.join('、')} 輪中獎了！`,
      confirmButtonText: '太棒了',
      theme: 'round-button',
    })
  },
})
</script>

<template>
  <div class="p-4 space-y-4">
    <h1 class="text-lg font-bold">抽獎通知測試頁</h1>

    <div class="rounded-lg bg-slate-50 p-3 text-sm space-y-1">
      <p>輪詢中：<b>{{ polling ? '是' : '否' }}</b>（每 3 秒）</p>
      <p>目前有抽獎進行：<b>{{ active ? '是' : '否' }}</b></p>
      <p>目前輪次：<b>{{ currentRound }}</b></p>
      <p>我的 id：<span class="break-all text-slate-600">{{ myId ?? '(未登入)' }}</span></p>
      <p>我中獎的輪次：<b>{{ myWinningRounds.length ? myWinningRounds.join('、') : '尚無' }}</b></p>
      <p v-if="lastError" class="text-red-500">錯誤：{{ lastError }}</p>
    </div>

    <van-button size="small" type="primary" @click="poll">立即刷新一次</van-button>

    <details class="text-xs text-slate-500">
      <summary class="cursor-pointer">原始回應（debug）</summary>
      <pre class="overflow-auto rounded bg-slate-900 p-2 text-slate-100">{{ lastResponse }}</pre>
    </details>

    <p class="text-xs text-slate-400 leading-relaxed">
      測試方式：用此帳號登入後開著本頁 → 在 Supabase 開獎讓本帳號中獎 → 幾秒內會跳「恭喜中獎」彈窗。
    </p>
  </div>
</template>
