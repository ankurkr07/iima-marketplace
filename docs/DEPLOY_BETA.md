# Beta Deployment Runbook

Goal: get IIMA Marketplace live for beta testers, entirely on **free tiers**.

**Stack:** Supabase (Postgres **+** image storage in one account) · Render
(backend API) · Vercel (frontend). You could swap Supabase for Neon + Cloudflare
R2, but Supabase is the fewest accounts to manage.

> Steps marked 🧑 need **you** (creating accounts, pasting URLs). Steps marked 🤖
> are code changes Ankur's assistant can make once you provide the values.

---

## 0. Prerequisites (🧑)
- The repo is already on GitHub: `ankurkr07/iima-marketplace` (`dev` branch).
- Accounts (all free): **Supabase**, **Render**, **Vercel**, and your existing
  **Google Cloud** OAuth client.

## 1. Database + storage — Supabase (🧑 → 🤖)
1. Create a project at <https://supabase.com>. Note the **database password**.
2. Project → **Settings → Database → Connection string → URI**. Copy it
   (looks like `postgresql://postgres:...@db.xxxx.supabase.co:5432/postgres`).
3. Project → **Storage → Create bucket** named `products`, set **Public**.
4. Project → **Settings → API** → copy the **Project URL** and **service_role key**.
5. Give these to the assistant. They will (🤖):
   - switch Prisma `provider` to `postgresql`,
   - add a Supabase Storage upload adapter (replaces local-disk writes),
   - commit to `dev`.

## 2. Backend — Render (🧑)
1. <https://render.com> → **New → Blueprint** → connect the repo → it reads
   `render.yaml`.
2. Fill the `sync:false` env vars:
   - `DATABASE_URL` = Supabase URI (from step 1.2)
   - `GOOGLE_CLIENT_ID` = your OAuth Web Client ID
   - `SMTP_USER` / `SMTP_PASS` = your Gmail + **App Password** (rotate the old one!)
   - `CORS_ORIGIN` / `PUBLIC_BASE_URL` — fill after step 3 & 4 (redeploy once known)
   - (Supabase) `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET=products`
3. Deploy. Note the service URL, e.g. `https://iima-marketplace-api.onrender.com`.
4. Seed once: Render → the service → **Shell** → `npx prisma db seed`.

## 3. Frontend — Vercel (🧑)
1. <https://vercel.com> → **Add New → Project** → import the repo.
2. **Root Directory: `frontend`** (Vercel auto-detects Next.js).
3. Environment variables:
   - `NEXT_PUBLIC_API_URL` = `https://<render-url>/api/v1`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = your OAuth Web Client ID
4. Deploy. Note the URL, e.g. `https://iima-marketplace.vercel.app`.

## 4. Wire the two together (🧑)
- Render → set `CORS_ORIGIN` = your Vercel URL, `PUBLIC_BASE_URL` = your Render
  URL → redeploy.
- Google Cloud → OAuth client → **Authorized JavaScript origins** → add the
  Vercel URL (keep `http://localhost:3000` for local).

## 5. Go-live checks
- [ ] `https://<render-url>/api/v1/health` returns `{ "status": "ok" }`.
- [ ] Vercel site loads; **Continue with Google** works with an `@iima.ac.in` account.
- [ ] A test listing with a photo uploads and displays (image served from Supabase).
- [ ] Rotate the Gmail App Password that was shared during development.
- [ ] Promote one real account to `ADMIN` (Supabase table editor → `User.role`).

---

### Notes
- Render free web services **sleep** after ~15 min idle (first request is slow) —
  fine for beta.
- Local dev keeps working against the same Supabase Postgres once `DATABASE_URL`
  is set in `backend/.env`.
