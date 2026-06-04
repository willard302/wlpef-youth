// https://nuxt.com/docs/api/configuration/nuxt-config
const sanitizedSupabaseUrl = process.env.SUPABASE_URL
  ?.replace(/\/rest\/v1\/?$/, '')
  .replace(/\/$/, '')

const supabasePublishableKey = process.env.SUPABASE_KEY

export default defineNuxtConfig({
  srcDir: './app',
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/styles/global.css'],
  app: {
    head: {
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'
        }
      ]
    }
  },

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  build: {
    transpile: ['vant']
  },

  imports: {
    dirs: ['app/stores', 'app/composables']
  },

  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase', '@vant/nuxt'],

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirectOptions: {
      login: '/auth/login',
      callback: '/auth/confirm',
      exclude: ['/auth/*']
    },
    types: '~/types/database.types.ts'
  },
})