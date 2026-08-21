# Vistar kitchen API (optional standalone)

The café app at the **repo root** already includes the kitchen at `/api` (`src/server` + `src/app/api`). That is what **Vercel** deploys.

This `/backend` folder is an optional **separate** Next.js process on port 3001 for local dual-port work. Prefer root `npm run dev` unless you need it.

Floor data lives in **Supabase Postgres**. Guest phones and admin share those tables.

## Step by step

### 1. Create a Supabase project

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. New project
3. Copy **Project URL** and **service_role** key (Settings → API). Never put the service role in the café app as `NEXT_PUBLIC_*`.

### 2. Create the café tables

In Supabase: **SQL Editor** → New query → paste root `supabase/schema.sql` (or `backend/supabase/schema.sql`) → **Run**.

### 3. Point the kitchen at Supabase

For **Vercel / single-app local**, set env on the **root** app (see root `.env.example`).

For this standalone process:

```bash
cd backend
cp .env.example .env.local
```

Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or publishable after policies).

### 4. Run (optional)

```bash
npm install
npm run dev
```

API: [http://localhost:3001](http://localhost:3001). Café can set `BACKEND_ORIGIN=http://127.0.0.1:3001` to proxy — leave that **unset** on Vercel.
| `POST` | `/api/sessions/:id/close` | staff Done — marks paid + closes |
| `POST` | `/api/sessions/:id/abandon` | staff Force clear |
| `POST` | `/api/sessions/:id/exit` | guest |
| `POST` | `/api/sessions/:id/resume` | staff |
| `POST` | `/api/sessions/claim` | public resume code |
| `POST` | `/api/sessions/:id/review` | after paid `{ tableId, rating, reviewNote }` |
| `GET` | `/api/orders` | staff |
| `POST` | `/api/orders` | guest + `Idempotency-Key` |
| `GET` | `/api/orders/:id` | guest |
| `PATCH` | `/api/orders/:id` | staff `{ status }` |
| `GET` | `/api/audit` | staff |
| `GET` | `/api/analytics` | staff |

PIN and resume HMAC live in **server** env (`STAFF_PIN`, `RESUME_SECRET`), not in the phone bundle. The database key is `SUPABASE_SERVICE_ROLE_KEY` on the kitchen only.
