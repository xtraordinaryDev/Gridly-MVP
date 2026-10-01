/**
 * Deployment-environment helpers. Keep these the single source of truth for
 * "is this production?" and "are demo affordances allowed?" so no code path
 * can accidentally show demo logins or mock data to real customers.
 */

/** True on the Vercel production deployment (or any NODE_ENV=production build outside Vercel). */
export function isProductionEnv(): boolean {
  const vercel = process.env.VERCEL_ENV
  if (vercel) return vercel === "production"
  return process.env.NODE_ENV === "production"
}

/**
 * Demo mode enables the one-click demo logins and lets the seed scripts run.
 * Off unless NEXT_PUBLIC_DEMO_MODE=true — never set it on production.
 */
export function isDemoModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true"
}
