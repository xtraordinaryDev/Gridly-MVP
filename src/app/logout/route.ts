import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"

export async function GET(request: Request) {
  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    // This browser only: the default scope would end the account's sessions on every device.
    await supabase.auth.signOut({ scope: "local" })
  }

  return Response.redirect(new URL("/login", request.url), 302)
}
