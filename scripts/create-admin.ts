/**
 * GridLink — create (or promote) a real admin login. Production-safe: no demo
 * rows, no fixed password, nothing flagged is_demo.
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts --email ops@yourcompany.com --name "Jane Doe" [--password '...']
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local
 * (or the process environment). If --password is omitted, a strong one is
 * generated and printed once. If the email already exists, the user is
 * promoted to admin and (when --password is given) the password is reset.
 */

import { randomBytes } from "crypto"
import { existsSync, readFileSync } from "fs"
import { resolve } from "path"
import { createClient } from "@supabase/supabase-js"
import ws from "ws"

if (typeof globalThis.WebSocket === "undefined") {
  ;(globalThis as Record<string, unknown>).WebSocket = ws
}

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    if (!(key in process.env)) process.env[key] = val
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in .env.local or the environment).")
    process.exit(1)
  }

  const email = arg("email")?.trim().toLowerCase()
  const fullName = arg("name")?.trim() || "GridLink Admin"
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("Usage: npx tsx scripts/create-admin.ts --email you@company.com --name \"Full Name\" [--password '...']")
    process.exit(1)
  }
  const explicitPassword = arg("password")
  const password = explicitPassword ?? randomBytes(18).toString("base64url")

  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  console.log(`Target: ${url}`)

  let userId: string
  const created = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } })
  if (created.data.user) {
    userId = created.data.user.id
    console.log(`Created auth user ${email}`)
  } else {
    // Already exists — find them and (optionally) reset the password.
    const { data: list, error } = await sb.auth.admin.listUsers({ perPage: 1000 })
    const existing = list?.users.find((u) => u.email?.toLowerCase() === email)
    if (error || !existing) {
      console.error("Couldn't create or find that user:", created.error?.message ?? error?.message)
      process.exit(1)
    }
    userId = existing.id
    if (explicitPassword) {
      const { error: pwErr } = await sb.auth.admin.updateUserById(userId, { password: explicitPassword })
      if (pwErr) console.warn("Password not updated:", pwErr.message)
    }
    console.log(`User ${email} already exists — promoting to admin.`)
  }

  const { error: profErr } = await sb.from("profiles").upsert({ id: userId, role: "admin", full_name: fullName, company_name: "GridLink" }, { onConflict: "id" })
  if (profErr) {
    console.error("Profile upsert failed:", profErr.message)
    process.exit(1)
  }

  console.log("\nAdmin ready.")
  console.log(`  Email:    ${email}`)
  if (!explicitPassword && created.data.user) console.log(`  Password: ${password}   (shown once — store it in a password manager)`)
  console.log("")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
