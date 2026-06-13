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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return Response.json(
      { error: "Missing environment variables" },
      { status: 500, headers: corsHeaders }
    )
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  // 1. Get user from Auth Header
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return Response.json(
      { error: "Missing Authorization header" },
      { status: 401, headers: corsHeaders }
    )
  }

  const token = authHeader.replace("Bearer ", "")
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

  if (authError || !user) {
    return Response.json(
      { error: "Invalid token or user not found" },
      { status: 401, headers: corsHeaders }
    )
  }

  // Parse request body for optional userId
  let targetUserId = user.id;
  let targetUserEmail = user.email;

  try {
    const body = await req.json();
    if (body.userId && body.userId !== user.id) {
      // Check if the caller is an admin
      const { data: callerProfile, error: callerError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (callerError || callerProfile?.role !== 'admin') {
        return Response.json(
          { error: "Unauthorized: Only admins can reset other accounts" },
          { status: 403, headers: corsHeaders }
        );
      }

      // Get target user email from auth
      const { data: { user: targetUser }, error: targetError } = await supabaseAdmin.auth.admin.getUserById(body.userId);
      
      if (targetError || !targetUser) {
        return Response.json(
          { error: "Target user not found" },
          { status: 404, headers: corsHeaders }
        );
      }

      targetUserId = targetUser.id;
      targetUserEmail = targetUser.email;
    }
  } catch (e) {
    // If no body or invalid JSON, default to the caller's account
    console.log("No valid JSON body found, defaulting to caller's account");
  }

  if (!targetUserEmail) {
    return Response.json(
      { error: "User email not found" },
      { status: 400, headers: corsHeaders }
    )
  }

  try {
    console.log(`Starting reset for user: ${targetUserId} (${targetUserEmail})`)

    // 2. Update event_registrations to prevent cascade delete and reset status
    const { error: updateError } = await supabaseAdmin
      .from("event_registrations")
      .update({
        matched_user_id: null,
        demo_user: true,
        registration_points_granted_at: null,
        invitation_sent_at: null
      })
      .eq("email", targetUserEmail)

    if (updateError) {
      console.error("Error updating event_registrations:", updateError)
      throw new Error(`Failed to update registrations: ${updateError.message}`)
    }

    // 3. Delete check-in records associated with the email
    const { error: checkinDeleteError } = await supabaseAdmin
      .from("checkin_records")
      .delete()
      .eq("email", targetUserEmail)

    if (checkinDeleteError) {
      console.error("Error deleting checkin_records:", checkinDeleteError)
      throw new Error(`Failed to delete check-in records: ${checkinDeleteError.message}`)
    }

    // 4. Delete user from auth.users (this will cascade delete profiles and related records)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)

    if (deleteError) {
      console.error("Error deleting user from auth:", deleteError)
      throw new Error(`Failed to delete user: ${deleteError.message}`)
    }

    console.log(`Successfully reset account for ${targetUserEmail}`)

    return Response.json(
      { success: true, message: "Account has been reset successfully." },
      { status: 200, headers: corsHeaders }
    )

  } catch (error: any) {
    console.error("reset-user-account error:", error)
    return Response.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    )
  }
})
