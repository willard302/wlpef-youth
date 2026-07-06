import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

type EventRow = {
  id: string
  title: string
  google_sheet_id: string | null
  feedback_response_sheet_id: string | null
  checkin_response_sheet_id: string | null
  checkin_form_sync_enabled: boolean
  feedback_bonus_points: number | null
  checkin_form_bonus_points: number | null
  start_at?: string
  end_at?: string
  status?: string | null
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
  raw_data?: Record<string, any>
  donation_year?: boolean
  registration_fee?: boolean
}

type SheetFeedbackResponse = {
  event_id: string
  matched_user_id: string | null
  email: string
  google_sheet_row_id: string
  form_submitted_at: string
  synced_at: string
  raw_data?: Record<string, any>
}

type SheetCheckinResponse = {
  event_id: string
  matched_user_id: string | null
  email: string
  google_sheet_row_id: string
  form_submitted_at: string
  synced_at: string
  raw_data?: Record<string, any>
}

type SyncResult = {
  eventId: string
  registrationSheetId?: string
  feedbackSheetId?: string
  checkinSheetId?: string
  registrationImportedCount: number
  registrationMatchedCount: number
  registrationSkippedCount: number
  feedbackImportedCount: number
  feedbackMatchedCount: number
  feedbackSkippedCount: number
  checkinImportedCount: number
  checkinMatchedCount: number
  checkinSkippedCount: number
  error?: string
}

type SyncRequestBody = {
  eventId?: string
  sheetId?: string
  feedbackSheetId?: string
  checkinSheetId?: string
  title?: string
  mode?: "recent"
  recentPastDays?: number
  recentFutureDays?: number
  syncTarget?: "registration" | "feedback" | "checkin" | "both"
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
  timestamp: ["時間戳記"],
  email: ["電子郵件", "電子郵件地址", "電子信箱", "信箱", "電郵"],
  name: ["姓名", "您的姓名"],
  donation_year: ["年度捐贈"],
  registration_fee: ["活動報名費", "報名費"]
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

const parseBooleanField = (value: unknown) => {
  if (typeof value === "boolean") return value
  if (value === null || value === undefined) return false

  const normalized = String(value).trim().toLowerCase()
  if (!normalized) return false

  return ["v", "y"].includes(normalized)
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

const findHeaderIndex = (headers: string[], aliases: string[], fallbackIndex = -1) => {
  const normalizedAliases = aliases.map(normalizeHeader)
  const normalizedHeaders = headers.map((header) => normalizeHeader(header))

  const exactIndex = normalizedHeaders.findIndex((header) => normalizedAliases.includes(header))
  if (exactIndex >= 0) return exactIndex

  const fuzzyIndex = normalizedHeaders.findIndex((header) =>
    normalizedAliases.some((alias) => header.includes(alias) || alias.includes(header)),
  )

  return fuzzyIndex >= 0 ? fuzzyIndex : fallbackIndex
}

const parseSubmittedAt = (value: string, fallbackIso: string) => {
  const raw = value.trim()
  if (!raw) return fallbackIso

  const normalizedMeridiem = raw
    .replace(/上午/gi, " AM ")
    .replace(/下午/gi, " PM ")
    .replace(/年/g, "/")
    .replace(/月/g, "/")
    .replace(/日/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  const directTimestamp = Date.parse(normalizedMeridiem)
  if (!Number.isNaN(directTimestamp)) {
    return new Date(directTimestamp).toISOString()
  }

  const ymdMatch = normalizedMeridiem.match(
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s*(AM|PM)?\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/i,
  )

  if (ymdMatch) {
    const [, year, month, day, meridiemRaw, hourRaw, minuteRaw, secondRaw] = ymdMatch
    let hour = Number(hourRaw)
    const minute = Number(minuteRaw)
    const second = Number(secondRaw || "0")
    const meridiem = (meridiemRaw || "").toUpperCase()

    if (meridiem === "PM" && hour < 12) hour += 12
    if (meridiem === "AM" && hour === 12) hour = 0

    const date = new Date(Number(year), Number(month) - 1, Number(day), hour, minute, second)
    return date.toISOString()
  }

  const mdyMatch = normalizedMeridiem.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s*(AM|PM)?\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/i,
  )

  if (mdyMatch) {
    const [, month, day, year, meridiemRaw, hourRaw, minuteRaw, secondRaw] = mdyMatch
    let hour = Number(hourRaw)
    const minute = Number(minuteRaw)
    const second = Number(secondRaw || "0")
    const meridiem = (meridiemRaw || "").toUpperCase()

    if (meridiem === "PM" && hour < 12) hour += 12
    if (meridiem === "AM" && hour === 12) hour = 0

    const date = new Date(Number(year), Number(month) - 1, Number(day), hour, minute, second)
    return date.toISOString()
  }

  // Keep pipeline stable, but avoid silently using "now" as parse fallback.
  return fallbackIso
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

async function loadProfilesByEmails(
  supabaseAdmin: SupabaseClient,
  emails: string[],
): Promise<Map<string, ProfileRow>> {
  const profiles = new Map<string, ProfileRow>()
  const distinctEmails = [...new Set(emails.map(normalizeEmail).filter(Boolean))]
  const chunkSize = 200

  for (let i = 0; i < distinctEmails.length; i += chunkSize) {
    const chunk = distinctEmails.slice(i, i + chunkSize)
    if (chunk.length === 0) continue

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id,email,name")
      .in("email", chunk)

    if (error) throw new Error(`Failed to load profiles: ${error.message}`)

    for (const profile of data || []) {
      const email = normalizeEmail(profile.email)
      if (email) profiles.set(email, profile)
    }
  }

  const missingEmails = distinctEmails.filter((email) => !profiles.has(email))
  if (missingEmails.length === 0) return profiles

  const pendingEmails = new Set(missingEmails)
  const usersFoundByEmail = new Map<string, { id: string; email: string; name: string | null }>()
  const perPage = 200
  let page = 1

  // Fallback: if profile rows are missing, scan auth users by email and backfill profiles.
  while (pendingEmails.size > 0) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`Failed to load auth users: ${error.message}`)

    const users = data?.users || []
    if (users.length === 0) break

    for (const user of users) {
      const email = normalizeEmail(user.email)
      if (!email || !pendingEmails.has(email)) continue

      const nameFromMeta =
        (typeof user.user_metadata?.name === "string" && user.user_metadata?.name.trim()) ||
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata?.full_name.trim()) ||
        null

      usersFoundByEmail.set(email, {
        id: user.id,
        email,
        name: nameFromMeta,
      })

      pendingEmails.delete(email)
      if (pendingEmails.size === 0) break
    }

    if (users.length < perPage) break
    page += 1
  }

  if (usersFoundByEmail.size > 0) {
    const profilesToUpsert = [...usersFoundByEmail.values()].map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name || user.email.split("@")[0] || "User",
      role: "member",
    }))

    const { error: upsertError } = await supabaseAdmin
      .from("profiles")
      .upsert(profilesToUpsert, { onConflict: "id", ignoreDuplicates: false })

    if (upsertError) {
      throw new Error(`Failed to upsert fallback profiles: ${upsertError.message}`)
    }

    for (const user of usersFoundByEmail.values()) {
      profiles.set(user.email, {
        id: user.id,
        email: user.email,
        name: user.name,
      })
    }
  }

  return profiles
}

function extractSheetEmails(rows: string[][]): string[] {
  if (rows.length <= 1) return []

  const headers = rows[0] || []
  const emailIndex = findHeaderIndex(headers, HEADER_ALIASES.email, 1)
  const seen = new Set<string>()
  const emails: string[] = []

  for (const row of rows.slice(1)) {
    const email = normalizeEmail(row[emailIndex])
    if (!email || seen.has(email)) continue
    seen.add(email)
    emails.push(email)
  }

  return emails
}

function toRegistrations(
  event: EventRow,
  rows: string[][],
  profilesByEmail: Map<string, ProfileRow>,
) {
  if (rows.length <= 1) return { registrations: [], skippedCount: 0 }

  const headers = rows[0] || []
  const timestampIndex = findHeaderIndex(headers, HEADER_ALIASES.timestamp)
  const emailIndex = findHeaderIndex(headers, HEADER_ALIASES.email, 1)
  const nameIndex = findHeaderIndex(headers, HEADER_ALIASES.name, 2)
  const donationIndex = findHeaderIndex(headers, HEADER_ALIASES.donation_year, 3)
  const registrationFeeIndex = findHeaderIndex(headers, HEADER_ALIASES.registration_fee, 4)
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
    const timestampValue = timestampIndex >= 0 ? pickString(row[timestampIndex]) : ""
    const submittedAt = parseSubmittedAt(timestampValue, syncedAt)
    const name = pickString(row[nameIndex]) || matchedProfile?.name || null
    const donationYear = donationIndex >= 0 ? parseBooleanField(row[donationIndex]) : false
    const registrationFee = registrationFeeIndex >= 0 ? parseBooleanField(row[registrationFeeIndex]) : false
    
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
      google_sheet_row_id: `${event.id}:row_${index + 2}`,
      form_submitted_at: submittedAt,
      synced_at: syncedAt,
      donation_year: donationYear,
      registration_fee: registrationFee,
      raw_data: rawData
    }

    return [registration] as SheetRegistration[]
  })

  return { registrations, skippedCount, duplicateCount }
}

function toFeedbackResponses(
  event: EventRow,
  rows: string[][],
  profilesByEmail: Map<string, ProfileRow>,
) {
  if (rows.length <= 1) return { responses: [], skippedCount: 0, duplicateCount: 0 }

  const headers = rows[0] || []
  const timestampIndex = findHeaderIndex(headers, HEADER_ALIASES.timestamp)
  const emailIndex = findHeaderIndex(headers, HEADER_ALIASES.email, 1)
  const syncedAt = new Date().toISOString()
  let skippedCount = 0
  let duplicateCount = 0

  const seenEmails = new Set<string>()

  const responses = rows.slice(1).flatMap((row, index): SheetFeedbackResponse[] => {
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
    const timestampValue = timestampIndex >= 0 ? pickString(row[timestampIndex]) : ""
    const submittedAt = parseSubmittedAt(timestampValue, syncedAt)

    const rawData: Record<string, any> = {}
    headers.forEach((header, i) => {
      const key = (header || `column_${i}`).trim()
      rawData[key] = row[i] || ""
    })

    const response: SheetFeedbackResponse = {
      event_id: event.id,
      matched_user_id: matchedProfile?.id || null,
      email,
      google_sheet_row_id: `${event.id}:feedback_row_${index + 2}`,
      form_submitted_at: submittedAt,
      synced_at: syncedAt,
      raw_data: rawData,
    }

    return [response]
  })

  return { responses, skippedCount, duplicateCount }
}

function toCheckinResponses(
  event: EventRow,
  rows: string[][],
  profilesByEmail: Map<string, ProfileRow>,
) {
  if (rows.length <= 1) return { responses: [], skippedCount: 0, duplicateCount: 0 }

  const headers = rows[0] || []
  const timestampIndex = findHeaderIndex(headers, HEADER_ALIASES.timestamp)
  const emailIndex = findHeaderIndex(headers, HEADER_ALIASES.email, 1)
  const syncedAt = new Date().toISOString()
  let skippedCount = 0
  let duplicateCount = 0

  const seenEmails = new Set<string>()

  const responses = rows.slice(1).flatMap((row, index): SheetCheckinResponse[] => {
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
    const timestampValue = timestampIndex >= 0 ? pickString(row[timestampIndex]) : ""
    const submittedAt = parseSubmittedAt(timestampValue, syncedAt)

    const rawData: Record<string, any> = {}
    headers.forEach((header, i) => {
      const key = (header || `column_${i}`).trim()
      rawData[key] = row[i] || ""
    })

    const response: SheetCheckinResponse = {
      event_id: event.id,
      matched_user_id: matchedProfile?.id || null,
      email,
      google_sheet_row_id: `${event.id}:checkin_row_${index + 2}`,
      form_submitted_at: submittedAt,
      synced_at: syncedAt,
      raw_data: rawData,
    }

    return [response]
  })

  return { responses, skippedCount, duplicateCount }
}

async function syncEvent(
  supabaseAdmin: any,
  event: EventRow,
  googleToken: string,
  syncTarget: NonNullable<SyncRequestBody['syncTarget']>,
): Promise<SyncResult> {
  try {
    const shouldSyncRegistration = (syncTarget === "registration" || syncTarget === "both") && !!event.google_sheet_id
    const shouldSyncFeedback = syncTarget === "feedback" || syncTarget === "both"
    const shouldSyncCheckin = (syncTarget === "checkin" || syncTarget === "both") && event.checkin_form_sync_enabled

    let registrationImportedCount = 0
    let registrationMatchedCount = 0
    let registrationSkippedCount = 0
    let feedbackImportedCount = 0
    let feedbackMatchedCount = 0
    let feedbackSkippedCount = 0
    let checkinImportedCount = 0
    let checkinMatchedCount = 0
    let checkinSkippedCount = 0

    if (shouldSyncRegistration) {
      const rows = await fetchSheetRows(event.google_sheet_id!, googleToken)
      const profilesByEmail = await loadProfilesByEmails(supabaseAdmin, extractSheetEmails(rows))
      const { registrations, skippedCount } = toRegistrations(event, rows, profilesByEmail)

      if (registrations.length > 0) {
        const { error } = await supabaseAdmin
          .from("event_registrations")
          .upsert(registrations, {
            onConflict: "event_id,email",
            ignoreDuplicates: false,
          })

        if (error) throw new Error(`Registration upsert failed: ${error.message}`)
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

      registrationImportedCount = registrations.length
      registrationMatchedCount = registrations.filter((registration) => !!registration.matched_user_id).length
      registrationSkippedCount = skippedCount
    }

    if (shouldSyncFeedback && event.feedback_response_sheet_id) {
      const feedbackRows = await fetchSheetRows(event.feedback_response_sheet_id, googleToken)
      const profilesByEmail = await loadProfilesByEmails(supabaseAdmin, extractSheetEmails(feedbackRows))
      const { responses, skippedCount } = toFeedbackResponses(event, feedbackRows, profilesByEmail)

      if (responses.length > 0) {
        const { error } = await supabaseAdmin
          .from("event_feedback_responses")
          .upsert(responses, {
            onConflict: "event_id,email",
            ignoreDuplicates: false,
          })

        if (error) throw new Error(`Feedback upsert failed: ${error.message}`)
      }

      feedbackImportedCount = responses.length
      feedbackMatchedCount = responses.filter((response) => !!response.matched_user_id).length
      feedbackSkippedCount = skippedCount
    }

    if (shouldSyncCheckin && event.checkin_response_sheet_id) {
      const checkinRows = await fetchSheetRows(event.checkin_response_sheet_id, googleToken)
      const profilesByEmail = await loadProfilesByEmails(supabaseAdmin, extractSheetEmails(checkinRows))
      const { responses, skippedCount } = toCheckinResponses(event, checkinRows, profilesByEmail)

      if (responses.length > 0) {
        const { error } = await supabaseAdmin
          .from("event_checkin_responses")
          .upsert(responses, {
            onConflict: "event_id,email",
            ignoreDuplicates: false,
          })

        if (error) throw new Error(`Checkin response upsert failed: ${error.message}`)
      }

      checkinImportedCount = responses.length
      checkinMatchedCount = responses.filter((response) => !!response.matched_user_id).length
      checkinSkippedCount = skippedCount
    }

    return {
      eventId: event.id,
      registrationSheetId: event.google_sheet_id || undefined,
      feedbackSheetId: event.feedback_response_sheet_id || undefined,
      checkinSheetId: event.checkin_response_sheet_id || undefined,
      registrationImportedCount,
      registrationMatchedCount,
      registrationSkippedCount,
      feedbackImportedCount,
      feedbackMatchedCount,
      feedbackSkippedCount,
      checkinImportedCount,
      checkinMatchedCount,
      checkinSkippedCount,
    }
  } catch (err: any) {
    return {
      eventId: event.id,
      registrationSheetId: event.google_sheet_id || undefined,
      feedbackSheetId: event.feedback_response_sheet_id || undefined,
      checkinSheetId: event.checkin_response_sheet_id || undefined,
      registrationImportedCount: 0,
      registrationMatchedCount: 0,
      registrationSkippedCount: 0,
      feedbackImportedCount: 0,
      feedbackMatchedCount: 0,
      feedbackSkippedCount: 0,
      checkinImportedCount: 0,
      checkinMatchedCount: 0,
      checkinSkippedCount: 0,
      error: err.message,
    }
  }
}

async function resolveEvents(supabaseAdmin: any, body: SyncRequestBody): Promise<EventRow[]> {
  const syncTarget = body.syncTarget || "both"

  if (body?.eventId) {
    if (body?.sheetId) {
      return [{
        id: body.eventId,
        title: body.title || body.eventId,
        google_sheet_id: body.sheetId,
        feedback_response_sheet_id: body.feedbackSheetId || null,
        checkin_response_sheet_id: body.checkinSheetId || null,
        checkin_form_sync_enabled: true,
        feedback_bonus_points: 0,
        checkin_form_bonus_points: 0,
      }]
    }

    const { data, error } = await supabaseAdmin
      .from("events")
      .select("id,title,google_sheet_id,feedback_response_sheet_id,checkin_response_sheet_id,checkin_form_sync_enabled,feedback_bonus_points,checkin_form_bonus_points,start_at,end_at,status")
      .eq("id", body.eventId)
      .maybeSingle()

    if (error) throw new Error(`Failed to load event for sync: ${error.message}`)
    if (!data) {
      throw new Error(`Event ${body.eventId} not found`)
    }

    if (syncTarget !== 'feedback' && !data.google_sheet_id) {
      throw new Error(`Event ${body.eventId} is missing google_sheet_id`)
    }

    if (syncTarget === 'feedback' && !data.feedback_response_sheet_id) {
      throw new Error(`Event ${body.eventId} is missing feedback_response_sheet_id`)
    }

    if (syncTarget === 'checkin' && !data.checkin_form_sync_enabled) {
      throw new Error(`Event ${body.eventId} has checkin form sync disabled`)
    }

    if (syncTarget === 'checkin' && !data.checkin_response_sheet_id) {
      throw new Error(`Event ${body.eventId} is missing checkin_response_sheet_id`)
    }

    if (syncTarget === 'both' && !data.feedback_response_sheet_id && (!data.checkin_form_sync_enabled || !data.checkin_response_sheet_id)) {
      throw new Error(`Event ${body.eventId} is missing feedback_response_sheet_id and no checkin sync source is enabled`)
    }

    if (data.status !== "published") {
      throw new Error(`Event ${body.eventId} is not published`)
    }

    return [data as EventRow]
  }

  const now = Date.now()
  const recentPastDays = Number.isFinite(body?.recentPastDays as number) ? Math.max(0, Math.min(180, Number(body?.recentPastDays))) : 14
  const recentFutureDays = Number.isFinite(body?.recentFutureDays as number) ? Math.max(0, Math.min(365, Number(body?.recentFutureDays))) : 60
  const recentWindowStart = new Date(now - recentPastDays * 24 * 60 * 60 * 1000).toISOString()
  const recentWindowEnd = new Date(now + recentFutureDays * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id,title,google_sheet_id,feedback_response_sheet_id,checkin_response_sheet_id,checkin_form_sync_enabled,feedback_bonus_points,checkin_form_bonus_points,start_at,end_at,status")
    .eq("status", "published")
    .gte("end_at", recentWindowStart)
    .lte("start_at", recentWindowEnd)

  if (error) throw new Error(`Failed to load events for sync: ${error.message}`)

  return (data || []).filter((event: EventRow) => {
    if (syncTarget === 'registration') return !!event.google_sheet_id
    if (syncTarget === 'feedback') return !!event.feedback_response_sheet_id
    if (syncTarget === 'checkin') return event.checkin_form_sync_enabled && !!event.checkin_response_sheet_id
    return !!event.google_sheet_id || !!event.feedback_response_sheet_id || (event.checkin_form_sync_enabled && !!event.checkin_response_sheet_id)
  })
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")

    if (!serviceRoleKey || !supabaseUrl || !anonKey) {
      throw new Error("Missing environment variables")
    }

    const authHeader = req.headers.get("Authorization") || ""
    const isServiceRole = authHeader.replace(/^Bearer\s+/i, "").trim() === serviceRoleKey

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    if (!isServiceRole) {
      // 驗證請求者是否為 admin
      const { data: { user: requester }, error: authError } = await createClient(
        supabaseUrl,
        anonKey,
        { global: { headers: { Authorization: authHeader } } }
      ).auth.getUser()

      if (authError || !requester) {
        return Response.json({ error: "Unauthorized", message: authError?.message }, { status: 401, headers: corsHeaders })
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", requester.id)
        .single()

      if (profile?.role !== "admin") {
        return Response.json({ error: "Forbidden", message: "Admin access required" }, { status: 403, headers: corsHeaders })
      }
    }

    const body = await req.json().catch(() => ({})) as SyncRequestBody
    const events = await resolveEvents(supabaseAdmin, body)
    const syncTarget = body.syncTarget || "both"

    if (events.length === 0) {
      return Response.json({ message: "No events to sync", results: [] }, { headers: corsHeaders })
    }

    const googleToken = await getGoogleAccessToken(Deno.env.get("GCP_SERVICE_ACCOUNT"))

    const results: SyncResult[] = []
    for (const event of events) {
      results.push(await syncEvent(supabaseAdmin, event, googleToken, syncTarget))
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
