import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

type EventRow = {
  id: string
  title: string
  google_sheet_id: string | null
  target_id: string | null
}

type ProfileRow = {
  id: string
  email: string | null
  name: string | null
}

type SheetRegistration = {
  event_id: string
  matched_user_id: string | null
  email: string
  name: string | null
  google_sheet_row_id: string
  form_submitted_at: string
  synced_at: string
  demo_user?: boolean
  raw_data?: Record<string, any>
}

type SyncResult = {
  eventId: string
  sheetId: string
  targetId: string | null
  importedCount: number
  matchedCount: number
  skippedCount: number
  error?: string
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
}

const HEADER_ALIASES = {
  timestamp: ["timestamp", "time", "submittedat", "submittedtime", "時間戳記", "提交時間", "報名時間"],
  email: ["email", "mail", "e-mail", "電子郵件", "電子郵件地址", "電子信箱", "信箱", "電郵"],
  name: ["name", "fullname", "displayname", "姓名", "名字", "名稱", "暱稱", "您的姓名"],
  demo_user: ["demouser", "demo", "測試帳號", "測試用戶", "演示用戶"],
}

const normalizeEmail = (value?: string | null) => (value || "").trim().toLowerCase()

const normalizeHeader = (value?: string | null) =>
  (value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_()（）:：-]/g, "")

const pickString = (value: unknown) => {
  if (typeof value !== "string") return ""
  return value.trim()
}

const toBase64Url = (input: string | ArrayBuffer) => {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : new Uint8Array(input)

  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

const pemToArrayBuffer = (pem: string) => {
  const base64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "")

  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function getGoogleAccessToken(serviceAccountJson: string | undefined): Promise<string> {
  if (!serviceAccountJson) {
    throw new Error("Missing GCP_SERVICE_ACCOUNT environment variable")
  }

  const serviceAccount = JSON.parse(serviceAccountJson)
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("GCP_SERVICE_ACCOUNT must include client_email and private_key")
  }

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", typ: "JWT" }
  const claim = {
    iss: serviceAccount.client_email,
    scope: GOOGLE_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  }

  const unsignedToken = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(claim))}`
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken),
  )
  const assertion = `${unsignedToken}.${toBase64Url(signature)}`

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  })

  const data = await response.json()
  if (!response.ok || !data.access_token) {
    throw new Error(`Google token request failed: ${data.error_description || data.error || response.statusText}`)
  }

  return data.access_token
}

const findHeaderIndex = (headers: string[], aliases: string[], fallbackIndex: number) => {
  const normalizedAliases = aliases.map(normalizeHeader)
  const index = headers.findIndex((header) => normalizedAliases.includes(normalizeHeader(header)))
  return index >= 0 ? index : fallbackIndex
}

const parseSubmittedAt = (value: string) => {
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? new Date().toISOString() : new Date(timestamp).toISOString()
}

async function fetchSheetRows(sheetId: string, googleToken: string): Promise<string[][]> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:Z`,
    {
      headers: {
        Authorization: `Bearer ${googleToken}`,
        "Content-Type": "application/json",
      },
    },
  )

  const data = await response.json()
  if (!response.ok) {
    throw new Error(`Google Sheets API failed: ${data.error?.message || response.statusText}`)
  }

  return data.values || []
}

async function loadProfilesByEmail(supabaseAdmin: any): Promise<Map<string, ProfileRow>> {
  const profiles = new Map<string, ProfileRow>()
  const pageSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id,email,name")
      .not("email", "is", null)
      .range(from, from + pageSize - 1)

    if (error) throw new Error(`Failed to load profiles: ${error.message}`)

    for (const profile of data || []) {
      const email = normalizeEmail(profile.email)
      if (email) profiles.set(email, profile)
    }

    if (!data || data.length < pageSize) break
    from += pageSize
  }

  return profiles
}

function toRegistrations(
  event: EventRow,
  rows: string[][],
  profilesByEmail: Map<string, ProfileRow>,
) {
  if (rows.length <= 1) return { registrations: [], skippedCount: 0 }

  const headers = rows[0] || []
  const timestampIndex = findHeaderIndex(headers, HEADER_ALIASES.timestamp, 0)
  const emailIndex = findHeaderIndex(headers, HEADER_ALIASES.email, 1)
  const nameIndex = findHeaderIndex(headers, HEADER_ALIASES.name, 2)
  const demoUserIndex = findHeaderIndex(headers, HEADER_ALIASES.demo_user, -1)
  const syncedAt = new Date().toISOString()
  let skippedCount = 0
  let duplicateCount = 0

  const seenEmails = new Set<string>()

  const registrations = rows.slice(1).flatMap((row, index): SheetRegistration[] => {
    const email = normalizeEmail(row[emailIndex])
    if (!email) {
      skippedCount += 1
      return []
    }

    if (seenEmails.has(email)) {
      duplicateCount += 1
      return []
    }

    seenEmails.add(email)

    const matchedProfile = profilesByEmail.get(email)
    const submittedAt = parseSubmittedAt(pickString(row[timestampIndex]))
    const name = pickString(row[nameIndex]) || matchedProfile?.name || null
    
    const rawData: Record<string, any> = {}
    headers.forEach((header, i) => {
      const key = (header || `column_${i}`).trim()
      rawData[key] = row[i] || ""
    })

    const registration: SheetRegistration = {
      event_id: event.id,
      matched_user_id: matchedProfile?.id || null,
      email,
      name,
      google_sheet_row_id: `${event.target_id || event.id}:row_${index + 2}`,
      form_submitted_at: submittedAt,
      synced_at: syncedAt,
      raw_data: rawData,
    }

    // 💡 只有當試算表真的有這欄時，才加入此屬性，避免蓋掉資料庫手動修改的值
    if (demoUserIndex >= 0) {
      const demoVal = (row[demoUserIndex] || "").trim().toLowerCase()
      registration.demo_user = ["true", "yes", "1", "是", "y"].includes(demoVal)
    }

    return [registration] as SheetRegistration[]
  })

  return { registrations, skippedCount, duplicateCount }
}

async function syncEvent(
  supabaseAdmin: any,
  event: EventRow,
  googleToken: string,
  profilesByEmail: Map<string, ProfileRow>,
): Promise<SyncResult> {
  try {
    if (!event.google_sheet_id) {
      throw new Error(`Event ${event.id} is missing google_sheet_id`)
    }

    const rows = await fetchSheetRows(event.google_sheet_id, googleToken)
    const { registrations, skippedCount } = toRegistrations(event, rows, profilesByEmail)

    if (registrations.length > 0) {
      const { error } = await supabaseAdmin
        .from("event_registrations")
        .upsert(registrations, {
          onConflict: "event_id,email",
          ignoreDuplicates: false,
        })

      if (error) throw new Error(`Upsert failed: ${error.message}`)
    }

    const allEmails = [...new Set(registrations.map(r => r.email).filter(Boolean))]

    if (allEmails.length > 0) {
      const { data: eventData, error: eventError } = await supabaseAdmin
        .from("events")
        .select("participants")
        .eq("id", event.id)
        .single()

      if (!eventError) {
        const currentParticipants = eventData?.participants || []
        const participants = [...new Set([...currentParticipants, ...allEmails])]
        await supabaseAdmin.from("events").update({ participants }).eq("id", event.id)
      }
    }

    return {
      eventId: event.id,
      sheetId: event.google_sheet_id,
      targetId: event.target_id,
      importedCount: registrations.length,
      matchedCount: allEmails.length,
      skippedCount,
    }
  } catch (err: any) {
    return {
      eventId: event.id,
      sheetId: event.google_sheet_id || "",
      targetId: event.target_id,
      importedCount: 0,
      matchedCount: 0,
      skippedCount: 0,
      error: err.message,
    }
  }
}

async function resolveEvents(supabaseAdmin: any, body: any): Promise<EventRow[]> {
  if (body?.eventId && body?.sheetId) {
    return [{
      id: body.eventId,
      title: body.title || body.eventId,
      google_sheet_id: body.sheetId,
      target_id: body.targetId || null,
    }]
  }

  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id,title,google_sheet_id,target_id")
    .not("google_sheet_id", "is", null)

  if (error) throw new Error(`Failed to load events for sync: ${error.message}`)

  return (data || []).filter((event: EventRow) => !!event.google_sheet_id)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

    const authHeader = req.headers.get("Authorization") || ""
    if (authHeader.replace(/^Bearer\s+/i, "").trim() !== serviceRoleKey) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const body = await req.json().catch(() => ({}))
    const events = await resolveEvents(supabaseAdmin, body)

    if (events.length === 0) {
      return Response.json({ message: "No events to sync", results: [] }, { headers: corsHeaders })
    }

    const [googleToken, profilesByEmail] = await Promise.all([
      getGoogleAccessToken(Deno.env.get("GCP_SERVICE_ACCOUNT")),
      loadProfilesByEmail(supabaseAdmin),
    ])

    const results: SyncResult[] = []
    for (const event of events) {
      results.push(await syncEvent(supabaseAdmin, event, googleToken, profilesByEmail))
    }

    // 觸發點數結算
    const { error: pointsError } = await supabaseAdmin.rpc("process_pending_points")
    if (pointsError) {
      console.error("RPC Error:", pointsError)
    }

    // 觸發邀請信件發送 (非同步，不等待)
    supabaseAdmin.functions.invoke("send-invitations", {
      body: { source: "sync-google-sheet", timestamp: new Date().toISOString() }
    }).catch(err => console.error("Invoke Error:", err))

    const hasErrors = results.some(r => !!r.error)

    return Response.json({
      message: hasErrors ? "Sync completed with some errors" : "Google Sheet data synced successfully",
      eventCount: results.length,
      success: !hasErrors,
      results,
    }, { headers: corsHeaders })

  } catch (error: any) {
    console.error("sync-google-sheet error:", error)
    return Response.json(
      { error: "Internal Server Error", message: error?.message || "未知錯誤" },
      { status: 500, headers: corsHeaders },
    )
  }
})
