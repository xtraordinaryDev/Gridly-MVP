import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

/** Exchanges a Supabase auth code (password recovery, magic link) for a session. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = url.searchParams.get("next") ?? "/login"
  // Local paths only. "//host" and "/\host" both resolve to another origin,
  // and control characters get stripped by URL parsers, so refuse all three.
  const local = /^\/(?![/\\])[^\\\u0000-\u001f]*$/.test(next) && new URL(next, url.origin).origin === url.origin
  const safeNext = local ? next : "/login"

  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type") as "recovery" | "magiclink" | "email" | "signup" | "invite" | null

  const supabase = await createClient()
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin))
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin))
  }
  return NextResponse.redirect(new URL("/forgot-password?error=link", url.origin))
}
