<script setup lang="ts">
interface Props {
  title: string
  eyebrow?: string
  heightClass?: string
  showBack?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  eyebrow: '領袖會社青團',
  heightClass: 'h-56',
  showBack: false
})

const router = useRouter()
const handleBack = () => router.back()
</script>

<template>
  <section :class="['relative overflow-hidden rounded-b-[3rem] shadow-2xl transition-all', heightClass]">
    <div class="absolute inset-0 z-0">
      <div class="h-full w-full bg-gradient-to-br from-sky-600 via-sky-500 to-indigo-400"></div>
      <div class="absolute inset-0 opacity-20 pattern-dots"></div>
    </div>

    <div class="relative z-10 h-full flex flex-col justify-between p-5 text-white sm:p-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <button
            v-if="showBack"
            @click="handleBack"
            class="mr-2 -ml-2 size-10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
          >
            <span class="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <LogoIcon v-else size="sm" />
          <div class="flex flex-col" :class="{ 'ml-4': !showBack }">
            <span class="text-sky-200 text-[10px] font-bold tracking-[0.2em] uppercase">{{ eyebrow }}</span>
            <h2 class="text-xl font-bold tracking-tight">{{ title }}</h2>
          </div>
        </div>
        <slot name="actions" />
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
</style>
