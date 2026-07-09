/**
 * GridLink — create admin + vendor demo logins.
 *
 * The main seed (seed-demo.ts) creates buyer logins and 30 directory vendors,
 * but no admin account and no vendor that can actually sign in. This script
 * fills that gap so all three portals are demoable.
 *
 * Usage:  npx tsx scripts/create-demo-logins.ts
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * Run AFTER seed-demo.ts (it links to an existing demo vendor).
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import ws from "ws"

// Node < 22 has no native WebSocket; supabase-js realtime needs one at init.
if (typeof globalThis.WebSocket === "undefined") {
  ;(globalThis as Record<string, unknown>).WebSocket = ws
}

import { DEMO_PASSWORD } from "./seed-demo-data"

const ADMIN_EMAIL = "admin@gridlink-demo.example.com"
const VENDOR_EMAIL = "vendor@gridlink-demo.example.com"

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local")
  if (!existsSync(envPath)) {
    console.error("Missing .env.local — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }
  const content = readFileSync(envPath, "utf8")
  for (const line of content.split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local")
    process.exit(1)
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

type SB = ReturnType<typeof supabaseAdmin>

/** Create the auth user if absent, otherwise reset its password. Returns the user id. */
async function ensureUser(
  sb: SB,
  email: string,
  role: "admin" | "vendor",
  companyName: string
): Promise<string> {
  const { data: list } = await sb.auth.admin.listUsers()
  const found = list?.users?.find((u) => u.email === email)

  let userId: string
  if (found) {
    userId = found.id
    await sb.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD })
  } else {
    const { data: created, error } = await sb.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { role, company_name: companyName },
    })
    if (error) throw new Error(`${email}: ${error.message}`)
    userId = created!.user!.id
  }

  await sb.from("profiles").upsert({
    id: userId,
    role,
    full_name: role === "admin" ? "Avery Chen" : "Marcus Reilly",
    company_name: companyName,
    is_demo: true,
  })

  return userId
}

async function main() {
  loadEnv()
  const sb = supabaseAdmin()

  console.log("\nGridLink — admin + vendor logins\n")

  // Admin -------------------------------------------------------------------
  await ensureUser(sb, ADMIN_EMAIL, "admin", "GridLink")
  console.log("Admin account ready.")

  // Vendor: link to the first demo vendor so the dashboard has real data -----
  const { data: vendor } = await sb
    .from("vendors")
    .select("id, company_name")
    .eq("is_demo", true)
    .order("company_name", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!vendor) {
    console.error("No demo vendors found — run `npm run seed:demo` first.")
    process.exit(1)
  }

  const vendorUserId = await ensureUser(
    sb,
    VENDOR_EMAIL,
    "vendor",
    vendor.company_name as string
  )

  await sb.from("vendors").update({ profile_id: vendorUserId }).eq("id", vendor.id as string)
  console.log(`Vendor account ready — linked to "${vendor.company_name}".`)

  // Summary -----------------------------------------------------------------
  console.log(`\nLogins (password for all): ${DEMO_PASSWORD}`)
  console.log(`  • Admin:  ${ADMIN_EMAIL}`)
  console.log(`  • Vendor: ${VENDOR_EMAIL}  →  ${vendor.company_name}`)
  console.log("  • Buyers: see `npm run seed:demo` output\n")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
