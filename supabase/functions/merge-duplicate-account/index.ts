import "@supabase/functions-js/edge-runtime.d.ts"
import { withSupabase } from "@supabase/server"

type MinimalAuthUser = {
  id: string
  email?: string | null
  created_at?: string
  identities?: Array<{ provider?: string | null }>
}

type ProfileRow = {
  id: string
  name: string | null
  department: string | null
  gender: string | null
  bio: string | null
  avatar_url: string | null
  phone_number: string | null
  role: string | null
  points: number | null
}

const PROFILE_REF_UPDATES: Array<{ table: string; column: string }> = [
  { table: "events", column: "created_by" },
  { table: "checkin_records", column: "user_id" },
  { table: "checkin_records", column: "checked_in_by" },
  { table: "event_registrations", column: "matched_user_id" },
  { table: "point_transactions", column: "user_id" },
]

const pickString = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim()
    }
  }
  return ""
}

const toRole = (primaryRole?: string | null, secondaryRole?: string | null) => {
  if (primaryRole === "admin" || secondaryRole === "admin") return "admin"
  return "member"
}

const normalizeEmail = (email?: string | null) => (email || "").trim().toLowerCase()

const getCreatedAt = (user: MinimalAuthUser) => {
  const timestamp = user.created_at ? Date.parse(user.created_at) : Number.NaN
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp
}

const isMissingRelation = (error: { code?: string } | null) => error?.code === "42P01"

async function listUsersByEmail(
  listUsers: (params: { page?: number; perPage?: number }) => Promise<{ data: { users: MinimalAuthUser[] } | null; error: { message: string } | null }>,
  email: string,
): Promise<MinimalAuthUser[]> {
  const users: MinimalAuthUser[] = []
  const perPage = 200
  let page = 1

  while (true) {
    const { data, error } = await listUsers({ page, perPage })
    if (error) throw new Error(error.message)

    const pageUsers = data?.users || []
    users.push(...pageUsers.filter((user) => normalizeEmail(user.email) === email))

    if (pageUsers.length < perPage) {
      break
    }
    page += 1
  }

  return users
}

async function reassignReference(
  supabaseAdmin: any,
  table: string,
  column: string,
  fromUserId: string,
  toUserId: string,
) {
  const { error } = await supabaseAdmin
    .from(table)
    .update({ [column]: toUserId })
    .eq(column, fromUserId)

  if (error && !isMissingRelation(error)) {
    throw new Error(`Failed to reassign ${table}.${column}: ${error.message}`)
  }
}

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (_req, ctx) => {
    try {
      const { data: authData, error: authError } = await ctx.supabase.auth.getUser()
      if (authError) {
        return Response.json({ error: authError.message }, { status: 401 })
      }

      const currentUser = authData?.user
      if (!currentUser || !currentUser.id || !currentUser.email) {
        return Response.json({ merged: false, reason: "no-auth-user" }, { status: 200 })
      }

      const normalizedEmail = normalizeEmail(currentUser.email)
      if (!normalizedEmail) {
        return Response.json({ merged: false, reason: "missing-email" }, { status: 200 })
      }

      const users = await listUsersByEmail(
        (params) => ctx.supabaseAdmin.auth.admin.listUsers(params),
        normalizedEmail,
      )

      if (users.length <= 1) {
        return Response.json({ merged: false, reason: "no-duplicate" }, { status: 200 })
      }

      const canonicalUser = [...users].sort((left, right) => {
        const createdAtDiff = getCreatedAt(left) - getCreatedAt(right)
        if (createdAtDiff !== 0) return createdAtDiff
        return left.id.localeCompare(right.id)
      })[0]

      let mergedCount = 0

      const duplicateUsers = users.filter((user) => user.id !== canonicalUser.id)

      for (const duplicate of duplicateUsers) {
        const secondaryId = duplicate.id
        const primaryId = canonicalUser.id

        const [{ data: primaryProfile }, { data: secondaryProfile }] = await Promise.all([
          ctx.supabaseAdmin.from("profiles").select("*").eq("id", primaryId).maybeSingle(),
          ctx.supabaseAdmin.from("profiles").select("*").eq("id", secondaryId).maybeSingle(),
        ]) as Array<{ data: ProfileRow | null }>

        const name = pickString(
          primaryProfile?.name,
          secondaryProfile?.name,
          normalizedEmail.split("@")[0],
          "User",
        )

        const mergedProfile = {
          id: primaryId,
          name,
          department: pickString(primaryProfile?.department, secondaryProfile?.department) || null,
          gender: pickString(primaryProfile?.gender, secondaryProfile?.gender) || null,
          bio: pickString(primaryProfile?.bio, secondaryProfile?.bio) || null,
          avatar_url: pickString(primaryProfile?.avatar_url, secondaryProfile?.avatar_url) || null,
          phone_number: pickString(primaryProfile?.phone_number, secondaryProfile?.phone_number) || null,
          role: toRole(primaryProfile?.role, secondaryProfile?.role),
          points: Math.max(primaryProfile?.points || 0, secondaryProfile?.points || 0),
          updated_at: new Date().toISOString(),
        }

        const { error: upsertError } = await ctx.supabaseAdmin
          .from("profiles")
          .upsert(mergedProfile)

        if (upsertError) {
          throw new Error(`Failed to upsert merged profile: ${upsertError.message}`)
        }

        for (const target of PROFILE_REF_UPDATES) {
          await reassignReference(ctx.supabaseAdmin, target.table, target.column, secondaryId, primaryId)
        }

        // 清掉次帳號 profile，避免殘留重複身份
        await ctx.supabaseAdmin.from("profiles").delete().eq("id", secondaryId)

        const { error: deleteUserError } = await ctx.supabaseAdmin.auth.admin.deleteUser(secondaryId)
        if (deleteUserError) {
          throw new Error(`Failed to delete duplicate auth user: ${deleteUserError.message}`)
        }

        mergedCount += 1
      }

      return Response.json({ merged: true, mergedCount }, { status: 200 })
    } catch (error: any) {
      console.error("merge-duplicate-account error:", error)
      return Response.json(
        { error: error?.message || "Internal Server Error" },
        { status: 500 },
      )
    }
  }),
}
