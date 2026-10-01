/**
 * Shared safety rail for the demo seed scripts. They write demo rows and
 * create well-known logins, so they must never run against production.
 *
 * The scripts read .env.local; demo mode is the same flag that enables the
 * one-click demo logins in the app (NEXT_PUBLIC_DEMO_MODE=true). Production
 * never sets it, so the scripts refuse there by default.
 */
export function assertDemoEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(unset)"
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    console.log(`Target: ${url} (demo mode)`)
    return
  }
  if (process.argv.includes("--force")) {
    console.warn(`WARNING: NEXT_PUBLIC_DEMO_MODE is not "true" but --force was passed. Target: ${url}`)
    return
  }
  console.error(
    [
      "Refusing to seed demo data.",
      `  Target: ${url}`,
      '  NEXT_PUBLIC_DEMO_MODE is not "true" in .env.local, so this may be a production database.',
      "  Point .env.local at a demo/staging project and set NEXT_PUBLIC_DEMO_MODE=true, or pass --force if you are certain.",
    ].join("\n")
  )
  process.exit(1)
}
