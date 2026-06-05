<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const router = useRouter()
const supabase = useSupabaseClient()
const loading = ref(false)
const initializing = ref(true)
const errorMessage = ref('')

const formData = ref({
  email: '',
  fullName: '',
  department: '',
  gender: '',
  bio: ''
})

const genderOptions = [
  { label: '請選擇性別', value: '' },
  { label: '男', value: 'male' },
  { label: '女', value: 'female' }
]

// Fetch existing user data if any
const fetchUserData = async () => {
  try {
    initializing.value = true
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      errorMessage.value = '使用者未登入，請重新登入。'
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
      return
    }

    formData.value.email = user.email || ''

    // Try to get existing profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (profile) {
      formData.value.fullName = profile.name || ''
      formData.value.department = profile.department || ''
      formData.value.gender = profile.gender || ''
      formData.value.bio = profile.bio || ''
      
      // 如果資料已經完整，直接跳轉首頁
      if (user.email && profile.department) {
        router.push('/home')
        return
      }
    } else {
      // Fallback to metadata
      const metadata = user.user_metadata || {}
      formData.value.fullName = metadata.full_name || metadata.name || ''
    }
  } catch (err: any) {
    console.error('Error fetching user data:', err)
    errorMessage.value = '載入使用者資訊失敗'
  } finally {
    initializing.value = false
  }
}

const handleCompleteRegistration = async () => {
  if (!formData.value.email.trim()) {
    errorMessage.value = '缺少 Email，請重新以 Google 或 Apple 登入'
    return
  }

  if (!formData.value.department.trim()) {
    errorMessage.value = '請輸入或選擇您的校友會'
    return
  }

  try {
    loading.value = true
    errorMessage.value = ''

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not found')

    const { userService } = await import('@/services/userService')
    
    await userService.completeSocialSignup({
      id: user.id,
      email: formData.value.email.trim(),
      name: formData.value.fullName.trim(),
      department: formData.value.department.trim(),
      gender: formData.value.gender,
      bio: formData.value.bio.trim()
    })

    router.push('/home')
  } catch (err: any) {
    console.error('Error completing registration:', err)
    if (err?.code === '22023' && String(err?.message || '').includes('role')) {
      errorMessage.value = '帳號角色設定異常，請先登出後重新登入；若仍失敗請聯絡管理員。'
    } else {
      errorMessage.value = err.message || '完成註冊失敗'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchUserData()
})
</script>

<template>
  <div class="relative flex min-h-screen w-full flex-col overflow-hidden bg-background-light font-display">

    <!-- Content -->
    <div class="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
      <div class="w-full max-w-sm glass-effect rounded-[2.5rem] flex flex-col gap-8 bg-white/80 backdrop-blur-xl p-8  shadow-2xl shadow-sky-200/50 border border-white/20">
        
        <!-- Header -->
        <div class="text-center space-y-3">
          <div class="size-20 bg-sky-500 rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
            <span class="material-symbols-outlined text-white text-4xl">person_add</span>
          </div>
          <h1 class="text-slate-900 text-2xl font-bold tracking-tight">完善基本資料</h1>
          <p class="text-slate-500 text-sm font-medium">歡迎加入領袖會！請填寫以下資訊以完成註冊</p>
        </div>

        <!-- Initializing State -->
        <div v-if="initializing" class="py-12 flex flex-col items-center justify-center gap-4">
          <div class="size-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-sky-600 font-bold text-sm tracking-widest">正在載入...</p>
        </div>

        <!-- Form Section -->
        <div v-else class="flex flex-col gap-5">
          <!-- Email -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
            <div class="bg-slate-100 rounded-2xl border border-slate-100 p-1 flex items-center">
              <span class="material-symbols-outlined text-slate-400 ml-3">mail</span>
              <input
                v-model="formData.email"
                type="email"
                class="w-full bg-transparent border-none text-slate-700 focus:ring-0 text-base py-3 px-3 outline-none cursor-not-allowed"
              />
            </div>
          </div>

          <!-- Full Name -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">全名 (選填)</label>
            <div class="bg-slate-50 rounded-2xl border border-slate-100 p-1 flex items-center transition-all focus-within:border-sky-300 focus-within:bg-white focus-within:shadow-sm">
              <span class="material-symbols-outlined text-slate-400 ml-3">badge</span>
              <input
                v-model="formData.fullName"
                type="text"
                placeholder="輸入您的真實姓名"
                class="w-full bg-transparent border-none text-slate-900 placeholder:text-slate-300 focus:ring-0 text-base py-3 px-3 outline-none"
              />
            </div>
          </div>

          <!-- Department -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">校友會 / 單位</label>
            <div class="bg-slate-50 rounded-2xl border border-slate-100 p-1 flex items-center transition-all focus-within:border-sky-300 focus-within:bg-white focus-within:shadow-sm">
              <span class="material-symbols-outlined text-slate-400 ml-3">account_balance</span>
              <input
                v-model="formData.department"
                type="text"
                placeholder="例如：台北校友會"
                class="w-full bg-transparent border-none text-slate-900 placeholder:text-slate-300 focus:ring-0 text-base py-3 px-3 outline-none"
              />
            </div>
          </div>

          <!-- Gender -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">性別</label>
            <div class="bg-slate-50 rounded-2xl border border-slate-100 p-1 flex items-center transition-all focus-within:border-sky-300 focus-within:bg-white focus-within:shadow-sm">
              <span class="material-symbols-outlined text-slate-400 ml-3">wc</span>
              <select
                v-model="formData.gender"
                class="w-full bg-transparent border-none text-slate-900 focus:ring-0 text-base py-3 px-3 outline-none appearance-none cursor-pointer"
              >
                <option v-for="opt in genderOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <span class="material-symbols-outlined text-slate-300 mr-3 pointer-events-none text-xl">expand_more</span>
            </div>
          </div>

          <!-- Bio -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">個人簡介 (選填)</label>
            <div class="bg-slate-50 rounded-2xl border border-slate-100 p-1 flex items-start transition-all focus-within:border-sky-300 focus-within:bg-white focus-within:shadow-sm">
              <span class="material-symbols-outlined text-slate-400 ml-3 mt-3">description</span>
              <textarea
                v-model="formData.bio"
                rows="3"
                placeholder="分享您的背景或習禪心得"
                class="w-full bg-transparent border-none text-slate-900 placeholder:text-slate-300 focus:ring-0 text-base py-3 px-3 outline-none resize-none"
              ></textarea>
            </div>
          </div>

          <!-- Error Message -->
          <transition name="fade">
            <div v-if="errorMessage" class="flex items-center gap-2 p-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold border border-red-100">
              <span class="material-symbols-outlined text-base flex-shrink-0">error</span>
              {{ errorMessage }}
            </div>
          </transition>

          <!-- Submit Button -->
          <button
            @click="handleCompleteRegistration"
            :disabled="loading"
            class="group relative w-full h-14 bg-sky-500 text-white font-bold rounded-2xl shadow-lg shadow-sky-500/30 overflow-hidden transition-all hover:bg-sky-600 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            <div class="relative z-10 flex items-center justify-center gap-2">
              <span v-if="loading" class="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span v-else class="material-symbols-outlined text-xl">done_all</span>
              <span class="tracking-widest">{{ loading ? '正在處理...' : '完成註冊' }}</span>
            </div>
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
          </button>
        </div>

        <div class="text-center pt-2">
          <NuxtLink to="/home" class="text-slate-400 text-sm font-bold hover:text-sky-500 transition-colors inline-flex items-center gap-1">
            <span>稍後再說，先回首頁</span>
            <span class="material-symbols-outlined text-base">arrow_forward</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Footer Branding -->
      <p class="mt-8 text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-2">
        <span class="w-8 h-[1px] bg-slate-200"></span>
        領袖會社青團
        <span class="w-8 h-[1px] bg-slate-200"></span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.animate-bounce-slow {
  animation: bounce 3s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(-5%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
  50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type=number] {
  -moz-appearance: textfield;
}
</style>
