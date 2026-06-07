<script setup lang="ts">
type HeaderVariant = 'page' | 'hero'

interface Props {
  title: string
  eyebrow?: string
  showBack?: boolean
  variant: HeaderVariant
  heightClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  eyebrow: '領袖會社青團',
  showBack: false,
  heightClass: 'h-56',
})

const router = useRouter()

const handleBack = () => {
  router.back()
}
</script>

<template>
  <header
    v-if="variant === 'page'"
    class="flex items-center justify-between px-4 py-4 bg-white/50 backdrop-blur-md sticky top-0 z-10 border-b border-sky-500/10 w-full"
  >
    <div class="flex items-center gap-3 min-w-0">
      <button
        v-if="showBack"
        type="button"
        @click="handleBack"
        class="shrink-0 text-slate-900 flex items-center justify-center p-2 rounded-lg hover:bg-sky-500/10 transition-colors"
        aria-label="返回上一頁"
      >
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div class="flex flex-col min-w-0">
        <span class="text-xs font-bold text-sky-500 tracking-wider uppercase truncate">
          {{ eyebrow }}
        </span>
        <h1 class="text-lg font-bold text-slate-900 leading-tight truncate">
          {{ title }}
        </h1>
      </div>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </header>

  <section
    v-else
    :class="['relative overflow-hidden rounded-b-[3rem] shadow-2xl transition-all', heightClass]"
  >
    <div class="absolute inset-0 z-0">
      <div class="h-full w-full bg-gradient-to-br from-sky-600 via-sky-500 to-indigo-400"></div>
      <div class="absolute inset-0 opacity-20 pattern-dots"></div>
    </div>

    <div class="relative z-10 h-full flex flex-col justify-between p-5 text-white sm:p-6">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center min-w-0">
          <button
            v-if="showBack"
            type="button"
            @click="handleBack"
            class="mr-2 -ml-2 size-10 shrink-0 rounded-full flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
            aria-label="返回上一頁"
          >
            <span class="material-symbols-outlined text-2xl">arrow_back</span>
          </button>

          <LogoIcon v-else size="sm" />

          <div class="flex flex-col min-w-0" :class="{ 'ml-4': !showBack }">
            <span class="text-sky-200 text-[10px] font-bold tracking-[0.2em] uppercase truncate">
              {{ eyebrow }}
            </span>
            <h2 class="text-xl font-bold tracking-tight truncate">
              {{ title }}
            </h2>
          </div>
        </div>

        <div class="shrink-0">
          <slot name="actions" />
        </div>
      </div>

      <div v-if="$slots.default" class="mb-4">
        <slot />
      </div>
    </div>
  </section>
</template>

<style scoped>
.pattern-dots {
  background-image: radial-gradient(circle, #fff 1px, transparent 1px);
  background-size: 20px 20px;
}

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
</style>
