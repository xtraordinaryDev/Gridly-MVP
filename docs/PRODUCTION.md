# GridLink — Production runbook

How production is set up, how to deploy, and the things that must never be done
against it. Keep this current; a second engineer should be able to follow it cold.

## Environments

| | Production | Local / staging |
|---|---|---|
| App | Vercel **Production** deployment (`main` branch) | `npm run dev`, or Vercel **Preview** deployments |
| Database | Supabase project **`gridlink`** (`vpyzimufcrkuxtkbzcmx`, us-west-2) | Same project today — see "Staging" below |
| Demo logins | **Off** (`NEXT_PUBLIC_DEMO_MODE` unset) | On (`NEXT_PUBLIC_DEMO_MODE=true`) |
| Seed scripts | **Refuse to run** | Allowed |

**Open item — the database still holds demo data.** As of 2026-10-01 the
`gridlink` project contains the seeded demo set (7 `*demo.example.com` logins,
~33 vendors, 16 RFPs, 38 invoices, 40 orders, 13 uploaded files). Before the
first real customer signs up, either reset it (see "Resetting demo data") or
stand up a separate production project and leave this one as staging.

### Staging

There is currently one Supabase project because the free plan allows two active
projects and the other slot is used by an unrelated app. When you want a real
staging database: pause the other project or upgrade the org to Pro, create
`gridlink-staging`, apply the migrations (below), point `.env.local` and Vercel
**Preview** env vars at it, and run the seed scripts there with
`NEXT_PUBLIC_DEMO_MODE=true`. Never set that flag on Production.

## Environment variables (Vercel → Settings → Environment Variables)

Set these on **Production** (and Preview, with staging values once it exists):

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API. Server-only; never expose. |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>` — used in emails and auth redirects |
| `CRON_SECRET` | Random string; Vercel Cron sends it as a Bearer token |
| `RESEND_API_KEY` | Resend → API Keys |
| `RESEND_FROM_EMAIL` | Must be on a **verified domain** in Resend. The default `onboarding@resend.dev` only delivers to the account owner. |
| `GRIDLINK_NOTIFY_EMAIL` | Ops inbox for new-RFP alerts |
| `ANTHROPIC_API_KEY` | AI features (RFP draft, supplier ranking, bid brief) |
| `EIA_API_KEY` | Fuel price benchmarks (free) |
| `GOOGLE_MAPS_API_KEY` | Station prices. Restrict the key to Geocoding API + Places API (New). |
| `FUEL_STATION_DAILY_CELL_LIMIT` | Optional, default 30 |

**Do not set** `NEXT_PUBLIC_DEMO_MODE` on Production.

If any Supabase variable is missing, production **fails closed**: portal routes
throw instead of rendering preview profiles.

## Database migrations

Migrations live in `supabase/migrations/` and are applied **in filename order**.
There is no automatic runner yet; apply new ones with the Supabase MCP
`apply_migration` tool or by pasting into the SQL Editor, then record it here.

Applied to `gridlink`: **0001 → 0015** (as of 2026-10-01).

When adding a migration: number it next in sequence, apply to staging first,
then production, then update the line above in the same PR.

## Resetting demo data

Irreversible. Do this once, deliberately, before onboarding real customers, and
only after confirming there are no real accounts (`select email from auth.users`).

1. Empty every table in `public` that holds demo rows (all of them today), in
   dependency order or with `truncate ... cascade`.
2. Delete all `auth.users` (every one is a demo login).
3. Delete every object in the `vendor-documents`, `rfp-attachments`,
   `delivery-docs` and `invoices` storage buckets.
4. Empty `fuel_station_cells` / `fuel_station_prices` (built around demo site
   locations). Keep `fuel_price_snapshots` — it's real EIA reference data.
5. Create the first real admin (below).

The exact SQL is short but destructive; have it reviewed and run it from the
Supabase SQL Editor, not from app code.

## First-time production setup

1. Apply migrations 0001–0015 in order (done on `gridlink`).
2. Create the first admin:
   ```
   npx tsx scripts/create-admin.ts --email ops@yourcompany.com --name "Your Name"
   ```
   It prints a generated password once. Store it in a password manager. Re-run
   with `--password` to reset it later.
3. In Supabase → Authentication → URL Configuration, set the Site URL to the
   production domain and add `https://<domain>/auth/callback` to Redirect URLs.
4. In Resend, verify the sending domain and set `RESEND_FROM_EMAIL`.
5. Set the Vercel env vars above and redeploy.

## Deploying

Push to `main`. Vercel builds and deploys Production automatically. The daily
cron (`vercel.json`, 12:00 UTC) calls `/api/cron/daily`, which closes expired
RFPs, sends document/invoice reminders, and refreshes fuel prices.

Pre-flight before merging anything to `main`:

```
npx tsc --noEmit && npm run lint && npm run build
```

## Onboarding real customers

Every account is admin-approved; there is no self-serve signup into the portals.

- **Buyers:** they submit `/signup` → appears in `/admin/buyers` → approve →
  they receive a create-account email.
- **Suppliers:** either they submit `/become-a-supplier`, or an admin sends an
  invite from `/admin/applications/invite` → they complete registration →
  approve in `/admin/applications` → they receive a create-account email →
  they upload W-9 / COI / licence in `/vendor/documents`.

Approval emails depend on Resend being configured with a verified domain.

## Things that must never happen on production

- Running `scripts/seed-demo.ts`, `seed-invoices.ts` or `create-demo-logins.ts`.
  They refuse unless `NEXT_PUBLIC_DEMO_MODE=true`; `--force` overrides that, so
  don't.
- Setting `NEXT_PUBLIC_DEMO_MODE=true` in Vercel Production.
- Pasting API keys into chat tools, tickets or commits. Rotate any key that was.
- Deleting a user from the Supabase dashboard: `profiles` cascades to invoices,
  payments, contracts and orders. Deactivate instead (open item: change those
  foreign keys to `on delete restrict`).

## Known gaps before paying customers

See the security and readiness audit (2026-09-30). Highest priority still open:

- RLS: `profiles` self-update allows role escalation; vendor "for all" write
  policies on `rfp_responses`, `invoices`, `vendors`; `ai_brief` readable by
  invited vendors; storage bucket policies allow anon access to
  `vendor-documents`.
- `awardRfpContract` needs a status guard and must verify the RFP update matched a row.
- RFP invitation / award / new-bid emails go to placeholder addresses.
- No mobile navigation in the portals.
- Terms of Service and Privacy Policy pages.
- Error tracking (Sentry) and CI.
