# Vistar

Customer-facing table ordering and kitchen billing for a restaurant floor. Guests scan a table QR (or enter a table number), build a live itemized bill, send the ticket to the kitchen, then scroll right into a distinct payment panel when the order is ready.

This is a **single Next.js app**: café UI + kitchen API (`/api/*`) in one deploy. Floor data lives in **Supabase Postgres**. Guest phones and `/admin` share that kitchen so orders and **Done → thank you** stay in sync.

## Stack

- Next.js 16 (App Router) + TypeScript
- Kitchen API route handlers (`src/app/api`, `src/server`)
- Supabase Postgres (sessions, orders, staff, audit)
- Tailwind CSS v4
- Zustand (guest claim, cart, outbox on the device)
- Lucide icons

## Deploy on Vercel (one project)

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
2. Push this repo to GitHub, then in [Vercel](https://vercel.com): **Add New Project** → import the repo.
3. Set **Framework Preset** to **Next.js** (not **Services**). Root [`vercel.json`](vercel.json) is a single-app deploy; kitchen is `/api` in the same app. Ignore the optional `/backend` folder — do not deploy it as a second service.
4. Add Environment Variables (Production + Preview):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `/api` |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-APP.vercel.app` (update after first deploy if needed) |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **service_role** secret (never `NEXT_PUBLIC_`) |
| `STAFF_PIN` | Kitchen PIN (e.g. `2468`) |
| `RESUME_SECRET` | Long random string for resume QR HMAC |
| `NEXT_PUBLIC_UPI_VPA` | Your UPI id for guest QR |
| `NEXT_PUBLIC_STAFF_PIN` | Same PIN as `STAFF_PIN` (admin UI gate) |

5. Deploy. Open `/api/health` — you want `"ok": true` and `"database": "supabase"`.
6. Set `NEXT_PUBLIC_APP_URL` to the final production URL, redeploy, then print QR cards from `/admin/tables`.

Do **not** set `BACKEND_ORIGIN` on Vercel. That is only for optional local proxying to a separate kitchen process.

## Local setup

1. Supabase: run `supabase/schema.sql`, then copy `.env.example` → `.env.local` and fill `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
2. Install and run **one** process:

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Kitchen lives at `/api` on the same port.

| Route | Purpose |
| --- | --- |
| `/` | Splash → welcome → table number or QR |
| `/table/1` … `/table/5` | Splash → welcome → name → session → menu |
| `/table/[tableId]/pay` | Combined session bill + payment |
| `/admin` | Active sessions by table, then Done to clear |
| `/admin/tables` | Printable tent-card QR codes |
| `/api/health` | Kitchen + Supabase health |

The floor has **five tables**. Each QR encodes that table’s own link:

- Table 1 → `/table/1`
- Table 2 → `/table/2`
- Table 3 → `/table/3`
- Table 4 → `/table/4`
- Table 5 → `/table/5`

Print cards from `/admin/tables`. Set `NEXT_PUBLIC_APP_URL` to your LAN or Vercel URL before printing.

Optional: the `/backend` folder is a **standalone** kitchen for local dual-port work (`npm run dev:api`). Prefer the in-app `/api` for Vercel and normal local use.

## Guest flow

1. Open `/` or scan a table QR. First you see the **Vistar logo splash**, then a welcome on a sandwiches / fries / coffee backdrop.
2. Home: enter or tap a table number. Table QR: enter your name. That starts a **private session** on that table only.
3. Tap Add, then Submit — that ticket is **Sending…** until the kitchen acknowledges it, then **Placed** (Order 1).
4. Add another order (Order 2, 3, …). All of them stay in one session table for you and the kitchen.
5. **View final bill** locks the session. No more orders can be added.
6. Pay the combined total. The same amount appears on the admin dashboard in real time.
7. **Exit** (header) ends the visit immediately if they have to leave — even with unpaid or pending tickets. The table frees for the next guest. Staff still see the full visit in History (paid, pending, exited).
8. Staff signs in at `/admin` with the kitchen PIN, then taps **Done** after a paid visit. If the guest never pays and never exits, staff **Force clear** with a required reason.

## Session architecture

One table has at most one **active** session (`open` | `billing` | `paid`). Orders belong to a session, not a loose table cart.

```
tables (1–5)
  └── sessions
        id, table_id, guest_name, token (secret), status
        last_activity_at, billed_at, paid_at, closed_at, close_reason
        └── orders
              id, session_id, sequence, idempotency_key (unique per session), items[], kitchen_status, totals
```

| Session status | Customer | Admin | Rules |
| --- | --- | --- | --- |
| `open` | Add / submit orders | Kitchen confirm / ready; live running total | New orders allowed |
| `billing` | Final bill only | Total locked | **No order mutations** |
| `paid` | Waiting for staff | **Done — clear table** | Payment recorded |
| `closed` | Name field for next guest | Filed under Closed sessions (paid or abandoned) | Token invalidated; table free |

**Table claim:** `POST /sessions` must be an atomic conditional insert — not read-then-write. Use a partial unique index on `table_id` where status is active (`open` | `billing` | `paid`), or `UPDATE tables SET session_id = $1 WHERE id = $2 AND session_id IS NULL` and reject when zero rows are affected. Two guests who scan Table 1 at the same instant get one winner and one `409`.

**Order submit:** Tapping Submit writes the ticket to a local outbox (`vistar-outbox-v1`) first and shows **Sending…**. It is not Placed until `POST /orders` succeeds (201/200). Timeouts and network drops retry automatically (2s, 5s, 15s, …) with the **same** `Idempotency-Key`. Coming back online retries immediately. The unique pair `(session_id, idempotency_key)` means a retry of a request that actually landed returns the original order. There is no guest retry button that mints a new key. The final bill waits until the outbox is empty.

**Sync:** Guest and admin share the floor store (`vistar-floor-v3`) with cross-tab `storage` events. With `NEXT_PUBLIC_API_URL`, both sides poll the same session/order APIs.

**Isolation:** The guest token is stored only on that device (`vistar-guest-v2`). Scanning the same QR while a session is live shows “Table occupied, please wait” — no name, no bill. Session and order detail require that token. **Done**, **Force clear**, and **Resume on new device** revoke the previous token server-side. Maya’s dead or still-open phone cannot act after resume. Closed sessions stay in history but leave the active table.

**Staff auth:** `/admin` and `/admin/tables` are behind a kitchen PIN wall. Guest names, tickets, totals, Done, Force clear, Resume, and the audit log do not render until staff sign in. Staff APIs also require that staff token — not just the UI.

**Staff-assisted resume:** If the guest’s phone dies, staff tap **Resume on new device**. That is not guest self-service. The server issues a signed, single-use code (5 minutes). Staff show it as a QR. The new phone hits `POST /sessions/claim`, receives a **new** guest token for the same `session_id`, and the old token is revoked so the dead phone cannot act if it later powers on.

**Production security (when you attach a backend):** treat guest `token` as an httpOnly cookie or signed session; never return it on admin list endpoints; authorize session/order **reads and writes** with that token; revoke it on close, abandon, and resume; keep resume HMAC server-side; public `GET /tables/:id` may return `{ occupied }` only; staff routes need a real kitchen login (not a public PIN in the JS bundle); authorize `POST /sessions/:id/close`, `POST /sessions/:id/abandon`, and `POST /sessions/:id/resume` for staff only; persist Force-clear notes in an append-only audit log.

## Admin flow

- Kitchen PIN sign-in (name + PIN) before any `/admin` page
- Active tables grouped by **guest session** (name + table + every order)
- Confirm / Ready still apply per kitchen ticket
- Session total updates as new orders land
- After the guest pays, **Done — clear table** (revokes guest token)
- **Exit** on the guest header ends the visit immediately (urgent leave). Table frees; history keeps every ticket.
- **Force clear** requires a short reason, abandons without payment, revokes the token, and writes the audit log
- **Resume on new device** issues a 5-minute, single-use signed QR if the guest’s phone dies. Scanning it on a new phone claims the same session and revokes the old token.
- Sessions idle longer than `NEXT_PUBLIC_SESSION_IDLE_MINUTES` (default 15) are flagged **stale**
- Closed sessions (paid, guest exited, or force-cleared) with every ticket status stay in History

## Environment

See `.env.example`.

| Variable | Role |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `/api` = live kitchen in this app. `mock` = in-browser store only |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Server floor DB (required on Vercel) |
| `STAFF_PIN` / `RESUME_SECRET` | Server kitchen PIN + resume HMAC |
| `BACKEND_ORIGIN` | Optional only: proxy `/api` to a separate kitchen. Leave unset on Vercel |
| `NEXT_PUBLIC_APP_URL` | Public origin baked into printed QR codes |
| `NEXT_PUBLIC_RESTAURANT_NAME` | Brand on headers and titles |
| `NEXT_PUBLIC_WELCOME_MESSAGE` / `NEXT_PUBLIC_WELCOME_BODY` | Splash welcome copy after the logo |
| `NEXT_PUBLIC_LOGO_SRC` / `NEXT_PUBLIC_LOGO_LIGHT_SRC` | Dark splash logo and light header logo |
| `NEXT_PUBLIC_HERO_SRC` | Optional photo behind the splash. Empty = illustrated sandwich / coffee / fries table |
| `NEXT_PUBLIC_CURRENCY` / `NEXT_PUBLIC_LOCALE` | Money formatting (default `INR` / `en-IN`) |
| `NEXT_PUBLIC_TAX_RATE` | GST on tickets (default `0.05`) |
| `NEXT_PUBLIC_TAX_LABEL` | Bill line label (default `GST`) |
| `NEXT_PUBLIC_POLL_INTERVAL_MS` | Polling interval when a remote API is set |
| `NEXT_PUBLIC_SESSION_IDLE_MINUTES` | Flag an active table stale after this many minutes with no activity (default `15`) |
| `NEXT_PUBLIC_STAFF_PIN` | Kitchen PIN for `/admin` UI gate (default `2468`). Change this |
| `NEXT_PUBLIC_RESUME_SECRET` | Client fallback for resume HMAC; prefer server `RESUME_SECRET` |
| `NEXT_PUBLIC_UPI_VPA` | UPI id shown on the pay QR |

## Backend contract

When `NEXT_PUBLIC_API_URL` is set, the client calls:

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `POST` | `/staff/login` | public | `{ pin, staffName }` → staff token. `401` if PIN is wrong |
| `POST` | `/staff/logout` | staff Bearer | Ends the kitchen session |
| `GET` | `/menu` | public | Available `MenuItem[]` |
| `GET` | `/tables/:id` | public | `{ tableId, occupied }` only — no guest name, orders, or amounts |
| `GET` | `/sessions/me?tableId=` | guest Bearer token | Owning **active** session + orders. `401` if the token was revoked (Done / Force clear). `403` if another guest owns the table |
| `GET` | `/sessions` | staff | All sessions. Do not include `token` |
| `POST` | `/sessions` | public | `{ tableId, guestName }` → session + token. Atomic claim; `409` if occupied (no name in the error) |
| `POST` | `/sessions/:id/bill` | guest token | Locks the check |
| `POST` | `/sessions/:id/pay` | guest token | `{ token, method }` |
| `POST` | `/sessions/:id/close` | staff | Requires `paid`. Revokes guest token. Normal Done path |
| `POST` | `/sessions/:id/exit` | guest token | Guest leaves now. Session `closed` with `closeReason: exited`. Table frees. Orders stay for admin history |
| `POST` | `/sessions/:id/resume` | staff | Issues a 5-minute, single-use signed resume code. Invalidates any unused code for that session |
| `POST` | `/sessions/claim` | public | `{ code }` → new guest token for that session. Marks the code used and revokes the previous token |
| `GET` | `/orders` | staff | Full ticket list. Do not filter this by public table QR |
| `GET` | `/audit` | staff | Append-only staff audit events |
| `GET` | `/orders/:id` | guest Bearer token | Single ticket; `403` if not the owner |
| `POST` | `/orders` | guest token | `{ tableId, sessionId, token, items, notes, idempotencyKey }` plus `Idempotency-Key` header. Same key + body replays; do not double-insert |
| `PATCH` | `/orders/:id` | staff | `{ status }` kitchen advance |
| `GET` | `/analytics` | staff | Peak demand + revenue snapshot |

Shapes live in `src/lib/types.ts`. The HTTP adapter is `src/lib/api/http.ts`; the mock adapter is `src/lib/api/mock.ts`. Swap happens in `src/lib/api/index.ts`.

Order statuses: `pending` → `confirmed` → `ready` / `awaiting_payment` → `paid`.

## Project map

```
src/
  app/                  Routes (guest, table menu, payment, admin) + api/[...path]
  server/               Kitchen (Supabase floor, sessions, orders)
  components/
    customer/           Menu, bill, status, payment deck
    admin/              Incoming tickets, analytics, history
    ui/                 Button, badge, card, alert, empty states
  hooks/                Orders, cart, menu, analytics, hydration
  lib/api/              Mock + HTTP service layer
  store/                Zustand carts and tickets
supabase/               schema.sql + policies for Supabase
```

## Scripts

```bash
npm run dev      # UI + kitchen API on :3000
npm run build    # production build (what Vercel runs)
npm run start    # serve the production build
npm run lint     # ESLint
npm run dev:api  # optional standalone kitchen in /backend (:3001)
npm run dev:all  # optional: café + separate /backend
```

## Notes

- Payment fields are a **demo checkout**. Nothing is charged.
- Floor data lives in **Supabase Postgres**. See `supabase/schema.sql`.
- Guest claims live in `vistar-guest-v2` on that phone.
- Unacknowledged submits live in `vistar-outbox-v1` and retry with the same idempotency key.
- Set `NEXT_PUBLIC_API_URL=mock` only if you want a same-browser demo with no backend.
