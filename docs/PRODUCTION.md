# GridLink — Production runbook

How production is set up, how to deploy, and the things that must never be done
against it. Keep this current; a second engineer should be able to follow it cold.

## Environments

| | Production | Local / staging |
|---|---|---|
| App | Vercel **Production** deployment (`main` branch) | `npm run dev`, or Vercel **Preview** deployments |
| Database | Supabase project **`gridlink-prod`** (`lmywnucxnaydvnrslisf`, us-east-2) | Supabase project **`gridlink`** (`vpyzimufcrkuxtkbzcmx`, us-west-2), the original project, now staging |
| Demo logins | **Off** (`NEXT_PUBLIC_DEMO_MODE` unset) | On (`NEXT_PUBLIC_DEMO_MODE=true`) |
| URL | https://www.gridlink.global (branch `main`) | https://test.gridlink.global (branch `staging`), plus `npm run dev` |
| Seed scripts | **Refuse to run** | Allowed |

**Production split (2026-10-20).** `gridlink-prod` was created empty from migrations 0001 → 0023 and holds only real data: the Updates contact list and send history, the expense ledger, and the two founder admin logins. The original `gridlink` project keeps the demo set and is the staging database behind test.gridlink.global and local development.

### Staging

Staging is the original `gridlink` project. Vercel **Preview** env vars and `.env.local` point at it with `NEXT_PUBLIC_DEMO_MODE=true`; the `staging` git branch deploys to test.gridlink.global. Apply every new migration to staging first, then to `gridlink-prod`, then record it below. Never set the demo flag on Production.

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
| `RESEND_FROM_EMAIL` | Must be on a **verified domain** in Resend. The default `onboarding@resend.dev` only delivers to the account owner. Also the sender for Admin → Updates (investor/customer updates); use e.g. `GridLink <updates@gridlink.global>`. |
| `GRIDLINK_NOTIFY_EMAIL` | Ops inbox for new-RFP alerts |
| `ANTHROPIC_API_KEY` | AI features (RFP draft, supplier ranking, bid brief). Every call is metered into `ai_usage` and shown on Admin → Expenses. |
| `ANTHROPIC_ADMIN_KEY` | Optional. Admin API key; the daily cron pulls Anthropic's official cost report into `ai_cost_daily` so Expenses shows the billed total next to the metered one. |
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

Applied to `gridlink` (staging): **0001 → 0016, 0019 → 0023** (0017/0018 pending). Applied to `gridlink-prod`: **0001 → 0023 in full** (as of 2026-10-20).

**Pending — must be applied in the same window as the code that expects them:**

- `0017_security_hardening.sql` — locks storage buckets, moves AI briefs off `rfps`, removes self-service role/verification writes. The app version before it (direct browser uploads, session-client bid writes, `rfps.ai_brief`) breaks once it is applied, so apply it and deploy together. After applying, run `node sec-verify.cjs` from the QA scripts.
- `0018_admin_guards.sql` — one vendor per application (de-duplicates first) and `buyer_applications.review_notes`.
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
