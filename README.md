# Weeble - US-first eSIM marketplace

Weeble is a US-first eSIM marketplace and customer dashboard with budget retail pricing and a free try path (ads + Free Starter plan).

## Providers

- **Firsty** (recommended) — real eSIM provider via official dashboard API at [api.firsty.app](https://api.firsty.app).
- **MockProvider** (default) — zero-cost local demo when no Firsty key is set. Shows a Demo badge.
- **DepinSim** (legacy / optional) — kept for compatibility; demoted. Prefer Firsty.

### Firsty API flow

1. `POST /oauth/token` with JSON `{ grant_type, client_id, client_secret }` → `access_token`
2. `GET /v1/bundles` → map bundles to plans
3. Purchase: `POST /v1/sims` `{ bundle_id, customer_ref }` + `Idempotency-Key`, then `POST /v1/sims/{id}/activate`, then `GET /v1/sims/{id}`

On any Firsty API failure Weeble falls back to MockProvider (never crashes). Homepage shows top US plans, or the first 3 plans if none are US-tagged.

## Pricing (very cheap for customers)

| Plan | Data / validity | Retail |
|------|--------------|-------|
| Free Starter | 100 MB / 3 days | **Free** (ads / demo unlock) |
| USA Lite | 1 GB / 7 days | ~$1.99 |
| USA Traveler | 3 GB / 15 days | ~$3.99 |
| USA Month | 5 GB / 30 days | ~$5.99 |
| USA Power | 10 GB / 30 days | ~$9.99 |
| International | 2∝5 GB packs | ~$2.49–$12 |

Ads-for-data remains free (75–150 MB per view, daily capped at 6).

### Owner cost model

- **Mock:** owner pays **$0** to develop and demo.
- **Firsty production:** you pay Firsty flat per-MB wholesale; set retail just above cost so margins stay thin but positive.
- Tune with `PRICE_MARKUP` (default `1.35`) and optional `FIRSTY_WHOLESALE_CENTS_PER_MB` (default ``0.25`). Seeded catalog prices are already hardcoded low.

## Stack

Next.js App Router · TypeScript · Tailwind CSS · Prisma · SQLite

## Quick start

1. `npm install`
2. `cp .env.example .env`
3. `npx prisma db push && npm run db:seed`
4. `npm run dev` → http://localhost:3000
5. Demo login: `demo@weeble.com` / `demo1234`
6. `npm run build && npm start`

## Configure Firsty

1. Get client id/secret from your Firsty dashboard.
2. Put them in `.env`; set `PROVIDER=firsty` (or leave unset to auto-select when credentials exist).
3. Default base: `FIRSTY_API_BASE=https://api.firsty.app`

## Environment variables

| Variable | Required | Description |
|---------|--------|-----------|
| `DATABASE_URL@ | yes | SQLite path, e.g. `file:/./dev.db` |
| `AUTH_SECRET` | yes | Long random string for session JWT  |
| `PROVIDER` | no | `mock` (default) / `firsty` / `depinsim` |
| `FIRSTY_CLIENT_ID` | no* | OAuth2 client id from builders.firsty.app |
| `FIRSTY_CLIENT_SECRET` | no* | OAuth2 client secret |
| `FIRSTY_API_BASE` | no | Default `https://api.firsty.app` |
| `PRICE_MARKUP` | no | Retail markup over wholesale (default `1.35`) |
| `FIRSTY_WHOLESALE_CENTS_PER_MB` | no | Approx wholesale cents/MB (default ``0.25`) |
| `DEPINSIM_ACCESS_TOKEN` | no | Legacy DepinSim token (optional) |

* Firsty live mode needs both `FIRSTY_CLIENT_ID` and `FIRSTY_CLIENT_SECRET`. Without credentials, Weeble stays on MockProvider (Demo badge).

## License

Private / unpublished — all rights reserved.
