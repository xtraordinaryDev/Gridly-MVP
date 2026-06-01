import { createClient as createServiceClient } from "@supabase/supabase-js"

/**
 * Service-role Supabase client. Bypasses RLS — use ONLY in trusted server
 * code (Server Actions / Route Handlers) for privileged operations such as
 * public vendor-application submissions and token-gated onboarding.
 *
 * NEVER import this into a Client Component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    )
  }

  return createServiceClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
