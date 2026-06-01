/**
 * Whether real Supabase credentials are present. The scaffold ships with
 * placeholder env values; until they're replaced, data-backed flows run in a
 * read-only "preview mode" so the UI is still demoable.
 */
export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY

  const placeholders = [
    undefined,
    "",
    "your-project-url",
    "your-anon-key",
    "your-service-role-key",
  ]

  return (
    !placeholders.includes(url) &&
    !placeholders.includes(anon) &&
    !placeholders.includes(service) &&
    !!url?.startsWith("http")
  )
}
