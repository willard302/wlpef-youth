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
    // 1. 找出尚未匹配用戶、是 demo 測試用戶、且尚未發送邀請的報名資料
    const { data: pendingInvitations, error: fetchError } = await supabase
      .from("event_registrations")
      .select("id, email, name")
      .is("matched_user_id", null)
      .eq("demo_user", true)
      .is("invitation_sent_at", null)

    if (fetchError) throw fetchError

    if (!pendingInvitations || pendingInvitations.length === 0) {
      return Response.json({ message: "No pending invitations for demo users" }, { headers: corsHeaders })
    }

    const results = []
    for (const reg of pendingInvitations) {
      try {
        // 💡 呼叫 Supabase 內建的邀請功能
        // 這會觸發 Supabase Auth 發送「User Invitation」郵件範本
        const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
          reg.email,
          {
            data: { 
              full_name: reg.name,
              invited_via: "event_registration_sync"
            },
            // 邀請成功後要導回的頁面
            redirectTo: 'https://new-chat-ashen.vercel.app/auth/confirm'
          }
        )

        if (inviteError) {
          // 如果用戶已經存在或已被邀請，我們視為「邀請已處理」
          if (inviteError.message.includes("already has been invited") || inviteError.message.includes("User already registered")) {
            console.log(`User ${reg.email} already exists or invited. Marking as sent.`);
            await supabase
              .from("event_registrations")
              .update({ invitation_sent_at: new Date().toISOString() })
              .eq("id", reg.id)
            
            results.push({ email: reg.email, status: "already_exists" })
            continue
          }
          throw inviteError
        }

        // 標記為已發送
        await supabase
          .from("event_registrations")
          .update({ invitation_sent_at: new Date().toISOString() })
          .eq("id", reg.id)
          
        results.push({ email: reg.email, status: "invited", userId: inviteData.user.id })
      } catch (err: any) {
        console.error(`Failed to invite ${reg.email}:`, err)
        results.push({ email: reg.email, status: "error", message: err.message })
      }
    }

    return Response.json({ 
      message: "Invitation process completed via Supabase Auth Invite", 
      invitedCount: results.filter(r => r.status === "invited").length,
      results 
    }, { headers: corsHeaders })

  } catch (error: any) {
    console.error("send-invitations error:", error)
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders })
  }
})
