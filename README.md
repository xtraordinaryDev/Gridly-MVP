# GridLink

B2B marketplace connecting fuel buyers (fleets, facilities, municipalities) with
verified fuel suppliers: RFPs and bids, awarded contracts, orders and
deliveries, invoicing, messaging, compliance documents, emissions tracking, and
AI assistance for drafting RFPs, ranking suppliers and comparing bids.

Next.js 16 (App Router, Turbopack) · Supabase (Postgres, Auth, Storage) ·
Resend · Anthropic · Vercel.

> This repo's Next.js version has conventions that differ from older releases.
> Read `node_modules/next/dist/docs/` before changing framework-level code.

## Local setup

```bash
npm install
cp .env.example .env.local      # fill in Supabase + any optional keys
npm run dev                     # http://localhost:3000
```

Without Supabase credentials the app runs in **preview mode** with in-memory
mock data, so the UI is browsable but nothing persists.

### Optional integrations

| Feature | Env | Where to get it |
|---|---|---|
| Transactional email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | resend.com (verify a domain for real delivery) |
| AI features | `ANTHROPIC_API_KEY` | console.anthropic.com |
| Area fuel prices | `EIA_API_KEY` | eia.gov/opendata (free) |
| Nearby station prices | `GOOGLE_MAPS_API_KEY` | Google Cloud — enable Geocoding API + Places API (New) |

## Database

Migrations are in `supabase/migrations/` and apply in filename order
(`0001` → `0015`). Apply them with the Supabase SQL Editor or MCP
`apply_migration`. See [docs/PRODUCTION.md](docs/PRODUCTION.md) for which
migrations are applied where.

## Demo data (local / staging only)

```bash
# .env.local must have NEXT_PUBLIC_DEMO_MODE=true or the scripts refuse to run
npm run seed:demo                          # buyers, vendors, RFPs, bids
npx tsx scripts/create-demo-logins.ts      # admin + vendor logins
npm run seed:invoices                      # contracts, invoices, payments
```

Demo mode also shows one-click demo sign-in buttons on `/login`.
**Never enable it in production.**

## Creating a real admin

```bash
npx tsx scripts/create-admin.ts --email you@company.com --name "Your Name"
```

## Daily cron

`/api/cron/daily` (scheduled in `vercel.json`) closes expired RFPs, sends
document-expiry and invoice reminders, and refreshes fuel prices. Run it locally:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily
```

## Checks

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Deploying

Push to `main` → Vercel deploys Production. Operations, env vars and the
production checklist: [docs/PRODUCTION.md](docs/PRODUCTION.md).
