<script setup lang="ts">
interface Props {
  title: string
  eyebrow?: string
  heightClass?: string
}

withDefaults(defineProps<Props>(), {
  eyebrow: '領袖會社青團',
  heightClass: 'h-56'
})
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
          <LogoIcon size="sm" />
          <div class="flex flex-col ml-4">
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
