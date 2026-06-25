export default defineEventHandler(async (event) => {
  // 先設快取標頭：對所有人回應一致，才能被 Vercel CDN 快取
  setHeader(
    event,
    'Cache-Control',
    `public, s-maxage=${RAFFLE_SMAXAGE_SECONDS}, stale-while-revalidate=${RAFFLE_SWR_SECONDS}`,
  )

  // 用既有的公開 anon key 呼叫 SECURITY DEFINER 函式 get_active_raffle()。
  // server 端 $fetch、不帶 cookie → 回應非個人化、可被 CDN 快取；不需 service role key。
  const { url, key } = useRuntimeConfig(event).public.supabase
  if (!url || !key) {
    throw createError({ statusCode: 500, statusMessage: 'supabase config missing' })
  }

  try {
    return await $fetch(`${url}/rest/v1/rpc/get_active_raffle`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: {},
    })
  }
  catch {
    throw createError({ statusCode: 500, statusMessage: 'active raffle lookup failed' })
  }
})
