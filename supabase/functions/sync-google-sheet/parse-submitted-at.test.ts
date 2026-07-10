// 執行方式（需模擬 Edge Runtime 的 UTC 時區，並驗證與 runtime 時區無關）:
//   TZ=UTC         node --experimental-strip-types --test supabase/functions/sync-google-sheet/parse-submitted-at.test.ts
//   TZ=Asia/Taipei node --experimental-strip-types --test supabase/functions/sync-google-sheet/parse-submitted-at.test.ts
import { test } from "node:test"
import assert from "node:assert/strict"
import { parseSubmittedAt } from "./parse-submitted-at.ts"

const FALLBACK = "2026-01-01T00:00:00.000Z"

test("中文上午時間戳記視為台北時間", () => {
  assert.equal(parseSubmittedAt("2026/7/10 上午 11:02:34", FALLBACK), "2026-07-10T03:02:34.000Z")
})

test("中文下午時間戳記視為台北時間", () => {
  assert.equal(parseSubmittedAt("2026/7/10 下午 7:02:34", FALLBACK), "2026-07-10T11:02:34.000Z")
})

test("上午 12 點為台北 00 時", () => {
  assert.equal(parseSubmittedAt("2026/7/10 上午 12:05:00", FALLBACK), "2026-07-09T16:05:00.000Z")
})

test("下午 12 點為台北 12 時", () => {
  assert.equal(parseSubmittedAt("2026/7/10 下午 12:05:00", FALLBACK), "2026-07-10T04:05:00.000Z")
})

test("24 小時制 Y/M/D 視為台北時間", () => {
  assert.equal(parseSubmittedAt("2026/7/10 16:53:00", FALLBACK), "2026-07-10T08:53:00.000Z")
})

test("M/D/Y 格式視為台北時間", () => {
  assert.equal(parseSubmittedAt("7/10/2026 16:53:00", FALLBACK), "2026-07-10T08:53:00.000Z")
})

test("年月日格式視為台北時間", () => {
  assert.equal(parseSubmittedAt("2026年7月10日 下午 4:53:00", FALLBACK), "2026-07-10T08:53:00.000Z")
})

test("台北凌晨換算為前一日 UTC", () => {
  assert.equal(parseSubmittedAt("2026/7/10 上午 3:08:00", FALLBACK), "2026-07-09T19:08:00.000Z")
})

test("帶明確時區的字串直接解析、不再位移", () => {
  assert.equal(parseSubmittedAt("2026-07-10T08:53:00Z", FALLBACK), "2026-07-10T08:53:00.000Z")
  assert.equal(parseSubmittedAt("2026-07-10T16:53:00+08:00", FALLBACK), "2026-07-10T08:53:00.000Z")
})

test("空字串回傳 fallback", () => {
  assert.equal(parseSubmittedAt("", FALLBACK), FALLBACK)
  assert.equal(parseSubmittedAt("   ", FALLBACK), FALLBACK)
})

test("無法解析的字串回傳 fallback", () => {
  assert.equal(parseSubmittedAt("not a date", FALLBACK), FALLBACK)
})

test("fallback 為 null 時原樣回傳 null", () => {
  assert.equal(parseSubmittedAt("", null), null)
  assert.equal(parseSubmittedAt("not a date", null), null)
})
