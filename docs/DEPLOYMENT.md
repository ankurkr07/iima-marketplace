# Deployment Guide — IIMA Marketplace

A from-scratch, beginner-friendly guide to putting IIMA Marketplace online.
It covers the recommended stack, environment variables, the SQLite → Postgres
switch, image storage, builds, domains, and SSL — with two hosting paths:

- **Path A — Managed (fastest, recommended):** Vercel + Render + Neon + R2.
- **Path B — IIMA server (Docker):** run the same app on an institute VM.

---

## 1. Architecture recap

```
┌──────────────┐        HTTPS        ┌──────────────┐        ┌─────────────┐
│  Next.js     │  ───────────────▶   │  Express API │ ─────▶ │ PostgreSQL  │
│  (frontend)  │   /api/v1/*         │  (backend)   │        │  (Neon)     │
│  Vercel      │ ◀───────────────    │  Render      │ ─────▶ │ Object store│
└──────────────┘   product images    └──────────────┘        │  (R2)       │
        ▲            (from R2/CDN)                             └─────────────┘
        │
     Browser  ── Google sign-in (GIS) ──▶ backend verifies token
```

The frontend is static + server components; the backend is a stateless Node
service. Both scale horizontally. State lives in Postgres and object storage.

---

## 2. Recommended stack (cost + scalability)

| Concern        | Recommendation            | Why                                                        | Free tier |
| -------------- | ------------------------- | ---------------------------------------------------------- | --------- |
| Database       | **Neon** (Postgres)       | Serverless Postgres, branching, scales to zero             | Yes       |
| Image/file store | **Cloudflare R2**       | S3-compatible, **zero egress fees**, cheap storage         | 10 GB     |
| Frontend host  | **Vercel**                | First-class Next.js, global CDN, automatic SSL             | Yes       |
| Backend host   | **Render** or **Railway** | Simple Node deploys, managed SSL, health checks            | Yes/cheap |
| Email          | **Gmail/Workspace SMTP**  | Already wired; move to a provider (SES/Resend) at scale    | Yes       |

Alternative all-in-one: **Supabase** gives Postgres **and** storage in one
dashboard — simplest if you want fewer accounts.

> **Rule of thumb:** never store images or files as blobs in the database.
> Store the file in object storage and keep only the URL in Postgres. This app
> already does that (the `/uploads` endpoint returns URLs).

---

## 3. Switch SQLite → PostgreSQL (one change)

The Prisma schema is provider-agnostic. To move to Postgres:

1. In `backend/prisma/schema.prisma`, change the datasource:
   ```prisma
   datasource db {
     provider = "postgresql"   // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
2. Set `DATABASE_URL` to your Neon connection string (see below).
3. Create the schema and seed:
   ```bash
   cd backend
   npx prisma migrate deploy   # or: npx prisma db push
   npx prisma db seed
   ```

No application code changes are required — the app reads/writes through Prisma.

---

## 4. Environment variables

### Backend (`backend/.env`)

| Variable             | Example                                           | Notes                                        |
| -------------------- | ------------------------------------------------- | -------------------------------------------- |
| `PORT`               | `4000`                                            | Render sets this automatically               |
| `NODE_ENV`           | `production`                                      | Disables dev mock sign-in & verbose logs     |
| `PUBLIC_BASE_URL`    | `https://api.iima-marketplace.in`                 | Used to build absolute image URLs            |
| `CORS_ORIGIN`        | `https://iima-marketplace.in`                     | Your frontend origin(s), comma-separated     |
| `DATABASE_URL`       | `postgresql://user:pass@host/db?sslmode=require`  | From Neon                                     |
| `JWT_SECRET`         | *(64+ random chars)*                              | `openssl rand -hex 32`                        |
| `JWT_EXPIRES_IN`     | `7d`                                              |                                              |
| `GOOGLE_CLIENT_ID`   | `xxxx.apps.googleusercontent.com`                 | See docs/GOOGLE_OAUTH_SETUP.md               |
| `SMTP_HOST`          | `smtp.gmail.com`                                  |                                              |
| `SMTP_PORT`          | `465`                                             | `587` for STARTTLS                           |
| `SMTP_SECURE`        | `true`                                            | `false` for port 587                         |
| `SMTP_USER`/`SMTP_PASS` | *(App Password)*                               | Never commit                                 |
| `SUPPORT_EMAIL`      | `p26ankur@iima.ac.in`                             |                                              |

For object storage (once you add the R2 adapter): `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`.

### Frontend (`frontend/.env.local` / Vercel env)

| Variable                      | Example                                   |
| ----------------------------- | ----------------------------------------- |
| `NEXT_PUBLIC_API_URL`         | `https://api.iima-marketplace.in/api/v1`  |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`| `xxxx.apps.googleusercontent.com`         |

---

## 5. Path A — Managed deploy (recommended)

### 5.1 Database (Neon)
1. Create a project at <https://neon.tech> → copy the connection string.
2. Set it as `DATABASE_URL` in the backend host.

### 5.2 Image storage (Cloudflare R2)
1. Create an R2 bucket, enable public access (or a custom domain).
2. Add an R2 upload adapter in place of the disk write in
   `backend/src/modules/uploads/uploads.routes.ts` (the sharp step stays; only
   `.toFile(...)` becomes an S3 `PutObject`). Return the public R2 URL.
3. Add the R2 hostname to `frontend/next.config.mjs` remote patterns.

> Until R2 is added, the app writes optimised images to the backend's local
> `uploads/` folder. That works on a single VM (Path B) but **not** on Render's
> ephemeral disk — so add R2 before scaling on managed hosts.

### 5.3 Backend (Render)
1. New → Web Service → connect the repo, root `backend/`.
2. Build: `npm install && npx prisma generate && npm run build`
   Start: `npx prisma migrate deploy && npm start`
3. Add all backend env vars. Deploy. Note the URL → this is your API origin.

### 5.4 Frontend (Vercel)
1. New Project → import repo → root `frontend/`.
2. Framework preset: **Next.js** (build/output auto-detected).
3. Add `NEXT_PUBLIC_*` env vars. Deploy.

### 5.5 Domain + SSL
- Add your domain in Vercel (frontend) and Render (backend, e.g. `api.` subdomain).
- Point DNS (A/CNAME) as each dashboard instructs.
- **SSL is automatic** on both (Let's Encrypt) — no manual certs.
- Update `CORS_ORIGIN`, `PUBLIC_BASE_URL`, and `NEXT_PUBLIC_API_URL` to the
  final domains, and add both origins to the Google OAuth "Authorized JavaScript
  origins".

---

## 6. Path B — IIMA institute server (Docker)

If the app must live on an IIMA-managed VM:

1. **Install** Docker + Docker Compose on the VM.
2. Use managed Postgres if available, else run Postgres in a container.
3. Build images for `backend/` and `frontend/` (Dockerfiles can be added — the
   backend is `npm run build` → `node dist/index.js`; the frontend is
   `next build` → `next start`).
4. Put **Nginx** in front as a reverse proxy:
   - `/` → frontend (:3000), `/api` → backend (:4000)
   - Terminate SSL with **Certbot / Let's Encrypt** (`certbot --nginx`).
5. Persist a volume for `backend/uploads/` (or use R2 as in Path A).
6. Configure the institute DNS to point the domain at the VM's public IP.

---

## 7. Production build (local check)

```bash
# Backend
cd backend && npm run build && npm start

# Frontend
cd frontend && npm run build && npm start
```

Both should start clean. `npm run typecheck` in each must pass.

---

## 8. Go-live checklist

- [ ] `NODE_ENV=production` on the backend (disables dev mock sign-in).
- [ ] Strong `JWT_SECRET` set (not the dev default).
- [ ] `GOOGLE_CLIENT_ID` set on **both** apps; production origin authorised.
- [ ] `DATABASE_URL` → Postgres; migrations applied; seed run once.
- [ ] Object storage (R2) wired for images; hostname allowed in next.config.
- [ ] `CORS_ORIGIN` / `PUBLIC_BASE_URL` / `NEXT_PUBLIC_API_URL` set to real domains.
- [ ] SMTP App Password rotated and stored only in the host's secrets.
- [ ] SSL verified (padlock) on both domains.
- [ ] Promote at least one real account to `ADMIN` for moderation & mailing.
