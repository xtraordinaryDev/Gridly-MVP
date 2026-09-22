import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { isSupabaseConfigured } from "@/lib/supabase/config"

/**
 * Refreshes the Supabase auth session on every request and persists the
 * rotated tokens to cookies. Server Components can read the session but
 * cannot write cookies, so without this a refreshed token is never saved and
 * the next Server Action (e.g. publishing an RFP) fails auth and bounces the
 * user to /login once the access token has expired.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  if (!isSupabaseConfigured()) return response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Triggers a token refresh when the access token has expired; the refreshed
  // session is written back through setAll above.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    // Skip static assets and images; run on every page, action, and route.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
}
