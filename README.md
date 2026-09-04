# Weeble - US-first eSIM marketplace

Weeble is a US-first eSIM marketplace and customer dashboard with budget retail pricing and a free try path (ads + Free Starter plan). Brand eSIMs with a **custom SPN** so the phone shows **Weeble**.

## Providers

- **eSIMCard** (recommended) — reseller API with **custom SPN**. Free setup; you only pay when you sell. Apply at [esimcard.com/partners](https://esimcard.com/partners/) (NDA, then API token). Enable **Custom SPN** in the partner portal and set it to **Weeble**. Sandbox: `https://sandbox.esimcard.com/api/developer/` · Live: `https://portal.esimcard.com/api/developer/`. Auth: `Authorization: Bearer <ESIMCARD_TOKEN>`. First call `GET check-token` returns an `extension`; subsequent calls use `base + extension + /`.
- **MockProvider** (default) — zero-cost local demo when no eSIMCard token is set. Shows a Demo badge. Activation strings are branded Weeble. Keep `PROVIDER=mock` on the VPS until you drop in a token.
- **Telnyx** (optional) — whitelabel eSIM reseller (`product: "whitelabel"`). Trial accounts cannot purchase eSIMs.
- **Firsty** (optional / legacy) — `api.firsty.app` has been unreliable (404). Prefer eSIMCard for SPN.
- **DepinSim** (legacy / optional) — kept for compatibility.

### eSIMCard purchase flow

1. List packages (`packages`, `packages/country`, `packages/global`) and map to Weeble plans with a thin retail markup.
2. On paid purchase: `POST package/purchase` with `{ package_type_id, sim_applied: true }`.
3. Read ICCID / QR / activation from the response or `GET my-esims/:id`.
4. Usage via `GET my-sim/:id/usage`, else local ledger.
5. On missing token or API errors fall back to MockProvider (never crashes).

SPN on device / branding = `ESIMCARD_SPN` (default Weeble). Enable Custom SPN in the eSIMCard partner portal.

## Pricing

Budget US and international packs; Free Starter via ads. Mock is free for the owner; eSIMCard is pay-when-you-sell reseller with custom SPN.

## Stack

Next.js App Router, TypeScript, Tailwind CSS, Prisma, SQLite

## Configure eSIMCard (go live / custom SPN)

1. Apply at https://esimcard.com/partners/ — sign NDA, get API token (setup is free; pay when you sell).
2. In the partner portal, enable **Custom SPN** and set it to **Weeble**.
3. Set `ESIMCARD_TOKEN`, `ESIMCARD_SANDBOX=true` (sandbox) or `false` (live), `ESIMCARD_SPN=Weeble`.
4. Set `PROVIDER=esimcard` (or leave unset — auto-selects when token is present).
5. Restart the app.

Until you have a token, keep `PROVIDER=mock`.

## Environment variables

| Variable | Required | Description |
|--------|--------|-----------|
| DATABASE_URL | yes | SQLite path |
| AUTH_SECRET | yes | Session JWT secret |
| PROVIDER | no | mock (default) / esimcard / telnyx / firsty / depinsim |
| ESIMCARD_TOKEN | no* | eSIMCard Bearer token from partner portal |
| ESIMCARD_SANDBOX | no | `true` (default) sandbox, `false` live portal |
| ESIMCARD_SPN | no | Custom SPN brand (default Weeble) |
| TELNYX_API_KEY | no | Telnyx Bearer token (optional) |
| TELNYX_WHITELABEL_NAME | no | Telnyx SPN (default Weeble) |
| WEEBLE_SPN | no | Alias for SPN / mock branding |
| FIRSTY_CLIENT_ID / SECRET / API_BASE | no | Legacy Firsty |
| DEPINSIM_ACCESS_TOKEN | no | Legacy |

\* eSIMCard live mode needs `ESIMCARD_TOKEN` from the partner program.

## License

Private / unpublished -- all rights reserved.
