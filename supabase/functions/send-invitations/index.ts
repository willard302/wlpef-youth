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
  
  // 使用 Service Role Key 建立 Admin 客戶端，才有權限調用 auth.admin
  const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  try {
    // 1. 找出尚未匹配用戶、且尚未發送邀請的報名資料
    const { data: pendingInvitations, error: fetchError } = await supabase
      .from("event_registrations")
      .select("id, email, name")
      .is("matched_user_id", null)
      .is("invitation_sent_at", null)
    if (fetchError) throw fetchError

    if (!pendingInvitations || pendingInvitations.length === 0) {
      return Response.json({ message: "No pending invitations for demo users" }, { headers: corsHeaders })
    }

    const results = []
    for (const reg of pendingInvitations) {
      try {
        console.log(`Processing invitation for: ${reg.email}`)
        
        // 1. 嘗試發送邀請
        const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
          reg.email,
          {
            data: { 
              full_name: reg.name,
              role: "member",
              invited_via: "event_registration_sync"
            },
            redirectTo: 'https://new-chat-ashen.vercel.app/auth/confirm'
          }
        )

        let targetUserId: string | undefined

        if (inviteError) {
          // 2. 如果用戶已存在，嘗試獲取其 ID 並補全 profile
          const duplicateUserErrors = [
            "already has been invited",
            "User already registered"
          ]

          const isAlreadyInvited = duplicateUserErrors.some(msg => {
            return inviteError?.message?.includes(msg)
          })

          if (!isAlreadyInvited) throw inviteError

          console.log(`User ${reg.email} already exists, fetching user details...`)
  
          const { data: userList } = await supabase.auth.admin.listUsers()
          const existingUser = userList.users.find(u => u.email?.toLowerCase() === reg.email.toLowerCase())
          
          if (existingUser) {
            targetUserId = existingUser.id
            console.log(`Found existing user ID: ${targetUserId}`)
          } else {
            throw new Error(`Could not find existing user for email: ${reg.email}`)
          }
        } else {
          targetUserId = inviteData.user.id
        }

        // 3. 確保 Profile 資料正確 (跟隨 admin-create-user 模式)
        if (targetUserId) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              id: targetUserId,
              email: reg.email,
              name: reg.name,
              role: "member"
            })

          if (profileError) {
            console.error(`Profile upsert error for ${reg.email}:`, profileError)
            // 不拋出錯誤，繼續標記報名表
          }
        }

        // 4. 標記報名表為已發送
        await supabase
          .from("event_registrations")
          .update({ invitation_sent_at: new Date().toISOString() })
          .eq("id", reg.id)
          
        results.push({ 
          email: reg.email, 
          status: inviteError ? "updated_existing" : "invited", 
          userId: targetUserId 
        })

      } catch (err: any) {
        console.error(`Failed to process ${reg.email}:`, err)
        results.push({ email: reg.email, status: "error", message: err.message })
      }
    }

    return Response.json({ 
      message: "Invitation process completed", 
      invitedCount: results.filter(r => r.status === "invited" || r.status === "updated_existing").length,
      results 
    }, { headers: corsHeaders })

  } catch (error: any) {
    console.error("send-invitations error:", error)
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders })
  }
})
