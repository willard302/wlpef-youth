<script setup lang="ts">
const { toasts, removeToast } = useToast()
</script>

<template>
  <div class="relative min-h-screen w-full flex flex-col max-w-[430px] mx-auto shadow-2xl overflow-hidden bg-background-light font-display">
    <!-- Shared Background Image with Overlay -->
    <div class="absolute inset-0 z-0">
      <div
        class="h-full w-full bg-cover bg-center"
        style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAKLqnX9ZXB6k4S_M2OiUzo28rwbVbB4qgtt-CuoJnz7esDmG4EipwCVb159pJxmBEUzY0SIMcJffb8sBWx7x0cCktLUUeogL4l_7CKhM4tw-WrZapPYOiXOJ_wFK0XCHI8tjk2PkDynPSxN-hiE_8DwZJ0-k355BY8O0Jn4yeAvRUuQ6juPcePLPZzromKaH4sAy7R06qG24jk8u4mJDZr3UbyPmicNP-tofDjENIMKDtGvnRYe5SgAVTeEDieQCXIlvpG11VqryQ')"
      ></div>
      <div class="absolute inset-0 bg-primary/10"></div>
    </div>

    <!-- Toast Notifications -->
    <div class="absolute top-0 left-0 right-0 z-[100] p-4 space-y-2 pointer-events-none flex flex-col items-center">
      <Toast
        v-for="toast in toasts"
        :key="toast.id"
        :message="toast.message"
        :type="toast.type"
        :duration="toast.duration"
        class="pointer-events-auto"
        @close="removeToast(toast.id)"
      />
    </div>

    <!-- Page Content -->
    <div class="relative z-10 flex-1 flex flex-col">
      <slot />
    </div>
  </div>
</template>

<style scoped></style>
