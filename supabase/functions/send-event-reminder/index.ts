import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

type EventRow = {
  id: string
  title: string
  start_at: string
  end_at: string
  location: string | null
}

type RegistrationRow = {
  id: string
  email: string
  name: string | null
  form_submitted_at: string | null
  matched_user_id: string | null
}

type RequestBody = {
  eventId?: string
  campaignKey?: string
  dryRun?: boolean
  subject?: string
  templateId?: number
  limit?: number
  testTo?: string
  idempotencyKey?: string
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
}

const BREVO_SEND_EMAIL_URL = "https://api.brevo.com/v3/smtp/email"
const DEFAULT_LIMIT = 1000

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  if (req.method !== "POST") {
    return Response.json(
      { success: false, error: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    )
  }

  try {
    const supabaseUrl = requiredEnv("SUPABASE_URL")
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
    const anonKey = requiredEnv("SUPABASE_ANON_KEY")
    const brevoApiKey = requiredEnv("BREVO_API_KEY")
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || ""
    const senderName = Deno.env.get("BREVO_SENDER_NAME") || "WLPEF Youth"
    const defaultTemplateId = numberFromEnv("BREVO_EVENT_REMINDER_TEMPLATE_ID")

    const authHeader = req.headers.get("Authorization") || ""
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    await assertAdminRequest({
      authHeader,
      serviceRoleKey,
      supabaseUrl,
      anonKey,
      supabaseAdmin,
    })

    const body = await req.json() as RequestBody
    const eventId = body.eventId?.trim()
    const campaignKey = body.campaignKey?.trim()
    const dryRun = body.dryRun !== false
    const limit = body.limit ?? DEFAULT_LIMIT

    if (!eventId) throw new Error("eventId is required")
    if (!campaignKey) throw new Error("campaignKey is required")
    if (!Number.isInteger(limit) || limit < 1 || limit > DEFAULT_LIMIT) {
      throw new Error(`limit must be an integer between 1 and ${DEFAULT_LIMIT}`)
    }

    const event = await loadEvent(supabaseAdmin, eventId)
    const recipients = await loadPendingRecipients(supabaseAdmin, eventId, campaignKey, limit)
    const templateId = body.templateId ?? defaultTemplateId

    // 有 template 時 sender/subject 交給 Brevo template 設定；fallback HTML 模式才需要 sender
    if (!templateId && !senderEmail) {
      throw new Error("BREVO_SENDER_EMAIL is required when no templateId is configured")
    }
    const subject = body.subject?.trim() || (templateId ? undefined : defaultSubject(event))

    if (dryRun) {
      return Response.json(
        {
          success: true,
          dryRun: true,
          event,
          campaignKey,
          count: recipients.length,
          recipients,
        },
        { headers: corsHeaders },
      )
    }

    if (recipients.length === 0) {
      return Response.json(
        { success: true, dryRun: false, event, campaignKey, sentCount: 0, message: "No pending recipients" },
        { headers: corsHeaders },
      )
    }

    const testTo = body.testTo?.trim()
    const payload = buildBrevoPayload({
      event,
      recipients,
      campaignKey,
      senderEmail,
      senderName,
      subject,
      templateId,
      testTo,
      idempotencyKey: body.idempotencyKey || crypto.randomUUID(),
    })

    const brevoResponse = await fetch(BREVO_SEND_EMAIL_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const brevoBody = await parseJsonResponse(brevoResponse)

    if (!brevoResponse.ok) {
      if (!testTo) {
        await insertFailedLogs(
          supabaseAdmin,
          eventId,
          campaignKey,
          recipients,
          JSON.stringify(brevoBody),
        )
      }

      return Response.json(
        { success: false, error: "Brevo API request failed", brevo: brevoBody },
        { status: 502, headers: corsHeaders },
      )
    }

    const messageIds = Array.isArray(brevoBody?.messageIds) ? brevoBody.messageIds : []
    if (!testTo) {
      await insertSentLogs(supabaseAdmin, eventId, campaignKey, recipients, messageIds)
    }

    return Response.json(
      {
        success: true,
        dryRun: false,
        testMode: Boolean(testTo),
        event,
        campaignKey,
        sentCount: recipients.length,
        messageIds,
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error("send-event-reminder error:", error)
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 400, headers: corsHeaders },
    )
  }
})

function requiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

function numberFromEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) return undefined
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`)
  }
  return parsed
}

async function assertAdminRequest(options: {
  authHeader: string
  serviceRoleKey: string
  supabaseUrl: string
  anonKey: string
  supabaseAdmin: any
}) {
  const { authHeader, serviceRoleKey, supabaseUrl, anonKey, supabaseAdmin } = options
  if (authHeader === `Bearer ${serviceRoleKey}`) return

  if (!authHeader) throw new Error("Unauthorized")

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) throw new Error("Unauthorized")

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (profile?.role !== "admin") throw new Error("Forbidden: Admin access required")
}

async function loadEvent(supabaseAdmin: any, eventId: string): Promise<EventRow> {
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id,title,start_at,end_at,location")
    .eq("id", eventId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Event not found")
  return data
}

async function loadPendingRecipients(
  supabaseAdmin: any,
  eventId: string,
  campaignKey: string,
  limit: number,
) {
  const [{ data: registrations, error: registrationError }, { data: sentLogs, error: logError }] =
    await Promise.all([
      supabaseAdmin
        .from("event_registrations")
        .select("id,email,name,form_submitted_at,matched_user_id")
        .eq("event_id", eventId)
        .not("email", "is", null)
        .order("form_submitted_at", { ascending: true })
        .limit(limit),
      supabaseAdmin
        .from("email_delivery_logs")
        .select("normalized_email")
        .eq("event_id", eventId)
        .eq("campaign_key", campaignKey)
        .eq("status", "sent"),
    ])

  if (registrationError) throw registrationError
  if (logError) throw logError

  const sentEmails = new Set((sentLogs ?? []).map((log: { normalized_email: string }) => log.normalized_email))
  const recipientsByEmail = new Map<string, RegistrationRow>()

  for (const registration of registrations ?? []) {
    const normalizedEmail = normalizeEmail(registration.email)
    if (!normalizedEmail || sentEmails.has(normalizedEmail) || recipientsByEmail.has(normalizedEmail)) continue
    recipientsByEmail.set(normalizedEmail, { ...registration, email: normalizedEmail })
  }

  return Array.from(recipientsByEmail.values())
}

function buildBrevoPayload(options: {
  event: EventRow
  recipients: RegistrationRow[]
  campaignKey: string
  senderEmail: string
  senderName: string
  subject?: string
  templateId?: number
  testTo?: string
  idempotencyKey: string
}) {
  const {
    event,
    recipients,
    campaignKey,
    senderEmail,
    senderName,
    subject,
    templateId,
    testTo,
    idempotencyKey,
  } = options

  const payload: Record<string, unknown> = {
    headers: {
      idempotencyKey,
    },
    messageVersions: recipients.map((recipient) => ({
      to: [
        {
          email: testTo || recipient.email,
          name: recipient.name || recipient.email,
        },
      ],
      params: recipientParams(event, recipient, campaignKey),
    })),
  }

  // subject 未指定且使用 template 時不帶，讓 Brevo template 的主旨生效
  if (subject) {
    payload.subject = subject
  }

  if (templateId) {
    payload.templateId = templateId
  } else {
    payload.sender = {
      email: senderEmail,
      name: senderName,
    }
    payload.htmlContent = defaultHtmlTemplate()
    payload.textContent = defaultTextTemplate()
  }

  const replyToEmail = Deno.env.get("BREVO_REPLY_TO_EMAIL")
  if (replyToEmail) {
    payload.replyTo = {
      email: replyToEmail,
      name: Deno.env.get("BREVO_REPLY_TO_NAME") || senderName,
    }
  }

  return payload
}

function recipientParams(event: EventRow, recipient: RegistrationRow, campaignKey: string) {
  return {
    name: recipient.name || recipient.email.split("@")[0],
    email: recipient.email,
    eventTitle: event.title,
    eventStartAt: event.start_at,
    eventEndAt: event.end_at,
    eventLocation: event.location || "",
    registrationId: recipient.id,
    campaignKey,
  }
}

function defaultSubject(event: EventRow) {
  return `WLPEF Youth 活動提醒：${event.title}`
}

function defaultHtmlTemplate() {
  return `
<!doctype html>
<html lang="zh-Hant">
  <body>
    <p>{{params.name}} 您好，</p>
    <p>提醒您已報名 {{params.eventTitle}}。</p>
    <p>活動時間：{{params.eventStartAt}}</p>
    <p>活動地點：{{params.eventLocation}}</p>
  </body>
</html>`
}

function defaultTextTemplate() {
  return "{{params.name}} 您好，提醒您已報名 {{params.eventTitle}}。活動時間：{{params.eventStartAt}}。活動地點：{{params.eventLocation}}。"
}

async function parseJsonResponse(response: Response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

async function insertSentLogs(
  supabaseAdmin: any,
  eventId: string,
  campaignKey: string,
  recipients: RegistrationRow[],
  messageIds: string[],
) {
  const rows = recipients.map((recipient, index) => ({
    event_id: eventId,
    registration_id: recipient.id,
    campaign_key: campaignKey,
    email: recipient.email,
    normalized_email: normalizeEmail(recipient.email),
    recipient_name: recipient.name,
    status: "sent",
    provider: "brevo",
    provider_message_id: messageIds[index] || null,
    sent_at: new Date().toISOString(),
  }))

  const { error } = await supabaseAdmin
    .from("email_delivery_logs")
    .upsert(rows, {
      onConflict: "event_id,campaign_key,normalized_email,status",
      ignoreDuplicates: true,
    })

  if (error) throw error
}

async function insertFailedLogs(
  supabaseAdmin: any,
  eventId: string,
  campaignKey: string,
  recipients: RegistrationRow[],
  errorMessage: string,
) {
  const rows = recipients.map((recipient) => ({
    event_id: eventId,
    registration_id: recipient.id,
    campaign_key: campaignKey,
    email: recipient.email,
    normalized_email: normalizeEmail(recipient.email),
    recipient_name: recipient.name,
    status: "failed",
    provider: "brevo",
    error_message: errorMessage.slice(0, 1000),
  }))

  const { error } = await supabaseAdmin
    .from("email_delivery_logs")
    .upsert(rows, {
      onConflict: "event_id,campaign_key,normalized_email,status",
    })

  if (error) console.error("Failed to insert email failure logs:", error)
}

function normalizeEmail(email: string | null | undefined) {
  const normalized = String(email ?? "").trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : ""
}
