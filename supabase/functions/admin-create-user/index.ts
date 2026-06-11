import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  
  const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  try {
    // 驗證請求者是否為 admin
    const authHeader = req.headers.get("Authorization")!
    const { data: { user: requester }, error: authError } = await createClient(supabaseUrl!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    }).auth.getUser()

    if (authError || !requester) throw new Error("Unauthorized")

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", requester.id)
      .single()

    if (profile?.role !== "admin") throw new Error("Forbidden: Admin access required")
// 取得參數
const { email, name, role = "member", points = 0, scanPermission = false } = await req.json()

if (!email || !name) throw new Error("Email and Name are required")

// 1. 邀請用戶 (這會建立 auth.users 記錄)
const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
  email,
  {
    data: { 
      full_name: name,
      role: role
    },
    redirectTo: `${new URL(req.url).origin.replace("/functions/v1/admin-create-user", "")}/auth/confirm`
  }
)

if (inviteError) {
  // 如果用戶已存在，可能是想要手動補全 profile
  if (inviteError.message.includes("already has been invited") || inviteError.message.includes("User already registered")) {
    // 檢查 profile 是否存在
    const { data: existingUser } = await supabase.auth.admin.listUsers()
    const user = existingUser.users.find(u => u.email === email)

    if (user) {
      // 嘗試建立或更新 profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: email,
          name: name,
          role: role,
          points: points,
          scan_permission: scanPermission
        })

      if (profileError) throw profileError

      return Response.json({ success: true, message: "User already exists, profile updated", userId: user.id }, { headers: corsHeaders })
    }
  }
  throw inviteError
}

// 2. 建立 profile (正常情況下)
// 注意：如果有 trigger 自動建立 profile，這裡可能需要 upsert
const { error: profileError } = await supabase
  .from("profiles")
  .upsert({
    id: inviteData.user.id,
    email: email,
    name: name,
    role: role,
    points: points,
    scan_permission: scanPermission
  })

    if (profileError) throw profileError

    return Response.json({ 
      success: true, 
      message: "Member created and invitation sent", 
      userId: inviteData.user.id 
    }, { headers: corsHeaders })

  } catch (error: any) {
    console.error("admin-create-user error:", error)
    return Response.json({ success: false, error: error.message }, { status: 400, headers: corsHeaders })
  }
})
