import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

    if (!email) {
      return Response.json(
        { error: "Missing email" },
        { status: 400, headers: corsHeaders }
      )
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing environment variables")
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    // Try to find user ID from profiles table first for efficiency
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    let user = null

    if (profile) {
      const { data: { user: foundUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id)
      if (!userError && foundUser) {
        user = foundUser
      }
    }

    // Fallback to listing users if not found in profiles (e.g. newly registered but no profile yet)
    if (!user) {
      const perPage = 100
      let page = 1
      const normalizedEmail = email.toLowerCase()

      while (!user) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
        if (error) throw error

        const users = data?.users || []
        user = users.find(u => u.email?.toLowerCase() === normalizedEmail) || null

        if (users.length < perPage || user) break
        page += 1
      }
    }

    if (!user) {
      return Response.json(
        { exists: false },
        { status: 200, headers: corsHeaders }
      )
    }

    const providers = user.identities?.map(id => id.provider) || []
    const hasPassword = user.app_metadata?.provider === 'email' || providers.includes('email') || providers.includes('email_password')

    return Response.json(
      { 
        exists: true, 
        providers,
        hasPassword,
        isSocialOnly: !hasPassword && providers.length > 0
      },
      { status: 200, headers: corsHeaders }
    )

  } catch (error: any) {
    console.error("check-user-registration error:", error)
    return Response.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    )
  }
})
