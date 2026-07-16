<div align="center">

# IIMA Marketplace

**The Official Student Marketplace of IIM Ahmedabad**
_Campus Buy · Sell · Exchange_

A polished, full-stack prototype of a campus-only marketplace where verified
IIM Ahmedabad students can buy, sell, exchange and discover products — designed
to grow from MVP into a production application without architectural rewrites.

</div>

---

## ✦ Overview

IIMA Marketplace is a trusted, institution-gated marketplace. The design language
is drawn from the university's iconic Louis Kahn red-brick campus: a deep brick
red primary, a warm off-white canvas, restrained greys, and a single muted gold
accent. The experience takes cues from Airbnb, Linear, Stripe and Notion —
minimal, elegant, and intentional.

This repository contains a **working end-to-end prototype**: an Express + Prisma
API seeded with 50 realistic listings, and a Next.js frontend covering the full
buyer/seller journey.

---

## ✦ Tech Stack

| Layer        | Technology                                                                 |
| ------------ | -------------------------------------------------------------------------- |
| **Frontend** | React 18 · Next.js 14 (App Router) · TypeScript · TailwindCSS · Framer Motion · TanStack Query · Axios · React Hook Form · Zod |
| **Backend**  | Node.js · Express · TypeScript · Prisma ORM · SQLite (prototype)           |
| **Auth**     | Mocked JWT (bcrypt password hashing, production-ready) — OAuth/SSO-ready    |

> **PostgreSQL migration:** the Prisma schema is written provider-agnostically.
> Switching from SQLite to Postgres requires only changing the `provider` and
> `DATABASE_URL` — **no application code changes**.

---

## ✦ Project Structure

```
IIMA-Marketplace/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Provider-agnostic data model
│   │   └── seed.ts              # 8 users, 18 categories, 50 listings
│   └── src/
│       ├── config/              # env + domain constants (enum sources of truth)
│       ├── lib/                 # Prisma client singleton
│       ├── middleware/          # auth, validation, error handling
│       ├── modules/             # feature-sliced: auth · products · users · categories · wishlist
│       │   └── <feature>/       # .schema · .service · .controller · .routes
│       ├── utils/               # ApiError, jwt, password, serializers, asyncHandler
│       ├── routes.ts            # /api/v1 router
│       ├── app.ts               # Express app factory
│       └── index.ts             # server bootstrap
│
├── frontend/
│   └── src/
│       ├── app/                 # App Router
│       │   ├── page.tsx         # Landing
│       │   ├── login/ · forgot-password/
│       │   └── (shell)/         # Chrome-wrapped app pages
│       │       ├── marketplace/ · product/[slug]/ · sell/
│       │       ├── dashboard/ · wishlist/ · messages/
│       │       ├── u/[username]/ · admin/
│       ├── components/          # brand · shell · product · marketplace · search · sell · ui · feedback
│       ├── providers/           # Query + Auth + Toast
│       ├── hooks/               # useDebounce · useRequireAuth
│       └── lib/                 # api · queries · types · format · cn
│
├── README.md
└── .gitignore
```

The backend follows a **feature-sliced, layered architecture** (schema →
service → controller → route). Business logic lives in services; controllers
stay thin. This keeps modules independent and easy to extend.

---

## ✦ Getting Started

**Prerequisites:** Node.js 18+ and npm.

### 1 · Backend

```bash
cd backend
cp .env.example .env          # (Windows: copy .env.example .env)
npm install
npm run setup                 # prisma generate + db push + seed
npm run dev                   # → http://localhost:4000/api/v1
```

### 2 · Frontend

```bash
cd frontend
cp .env.example .env.local    # (Windows: copy .env.example .env.local)
npm install
npm run dev                   # → http://localhost:3000
```

### Test accounts

The database seeds **no listings** — every user builds their own with their own
photos. Four ready-to-share student accounts are created (all ordinary users):

| Username    | Password      |
| ----------- | ------------- |
| `p26ankur1` | `Brick@2026`  |
| `p26ankur2` | `Kahn@2026`   |
| `p26ankur3` | `Sabar@2026`  |
| `p26ankur4` | `Vikram@2026` |

The login form fixes the `@iima.ac.in` suffix — you only ever type the username.
Share these with testers: each person logs in, lists their own items, and sees
everyone else's real listings.

---

## ✦ Features

- **Landing page** — editorial hero (real Louis Kahn Plaza photograph), live
  listing/category counts, feature grid, category preview, CTA.
- **Google sign-in (@iima.ac.in only)** — Google Identity Services on the
  frontend; the backend verifies the token, enforces the institute domain, and
  issues our JWT. Falls back to a dev mock + password login until a Client ID is
  set. See [docs/GOOGLE_OAUTH_SETUP.md](docs/GOOGLE_OAUTH_SETUP.md).
- **Login-gated marketplace** — nothing beyond the landing/login is reachable
  without signing in. New users complete an onboarding profile first.
- **WhatsApp-first contact** — every listing has a "Chat on WhatsApp"
  (`wa.me`) button; phone/room visibility is user-controlled while email is
  always shown. Contact clicks feed per-listing analytics (views, WhatsApp,
  email, call) shown to the seller.
- **Real image uploads** — drag-and-drop photos are uploaded to the backend
  (`/uploads`, multer), stored on the server, and served over HTTP. Swap the
  disk adapter for S3/Cloudinary later with no frontend change.
- **Ownership rules** — only a listing's owner can edit, change status
  (Available / Reserved / Sold) or delete it, enforced both in the UI and
  server-side (403 otherwise). Everyone else can view, contact or report.
- **Marketplace** — URL-synced filters (category, price, condition, availability,
  hostel), sorting, pagination, and debounced instant search with live suggestions.
- **Product detail** — image gallery, spec sheet, seller card, related items,
  save/share/report, and an elegant `SOLD` overlay (listings are never removed).
- **Sell flow** — drag-and-drop image board, live preview, full validation.
- **Dashboard** — overview stats, listing management (status + delete),
  wishlist, sold items, and settings (profile + password change).
- **Public profiles**, **wishlist**, **prototype chat**, and an **admin panel**.
- Polished **micro-interactions** throughout — page transitions, image
  skeletons, loading shimmers, toast notifications, and hover elevation.

---

## ✦ API Reference (`/api/v1`)

| Method | Endpoint                    | Auth  | Description                          |
| ------ | --------------------------- | ----- | ----------------------------------- |
| POST   | `/auth/login`               | —     | Log in with username + password     |
| POST   | `/auth/google`              | —     | Sign in with a Google ID token      |
| GET    | `/auth/config`              | —     | Which sign-in methods are enabled   |
| POST   | `/auth/register`            | —     | Register a new institute account    |
| GET    | `/auth/me`                  | ✓     | Current user                        |
| POST   | `/auth/change-password`     | ✓     | Change password                     |
| GET    | `/products`                 | —     | List with filters, sort, pagination |
| GET    | `/products/:slug`           | —     | Detail + related listings           |
| POST   | `/products`                 | ✓     | Create a listing                    |
| PATCH  | `/products/:id`             | ✓     | Update (owner/admin)                |
| PATCH  | `/products/:id/status`      | ✓     | Set AVAILABLE / RESERVED / SOLD     |
| DELETE | `/products/:id`             | ✓     | Remove (owner/admin)                |
| GET    | `/categories`               | —     | Categories with live counts         |
| GET    | `/users/:username`          | —     | Public profile + listings           |
| PATCH  | `/users/me`                 | ✓     | Update own profile                  |
| GET    | `/wishlist`                 | ✓     | Saved listings                      |
| POST   | `/wishlist/:productId/toggle` | ✓   | Toggle save                         |
| POST   | `/uploads`                  | ✓     | Upload image files → hosted URLs    |
| POST   | `/products/:id/track`       | —     | Record a contact-channel click      |

---

## ✦ Future Roadmap

The codebase is intentionally modular so these integrate with minimal change:

- **Auth:** Google OAuth → IIMA SSO (isolated in `auth.service.ts`)
- **Payments:** Razorpay escrow
- **Realtime chat:** Socket.IO (the `Conversation`/`Message` models already exist)
- **Notifications**, **loyalty points**, **recommendation engine**
- **AI:** search, product descriptions, price suggestion, fraud detection
- **New markets:** rentals, lost & found, event tickets, roommate matching

Placeholder "Coming soon" surfaces for these already appear throughout the UI.

---

## ✦ Security (prototype posture)

- Passwords hashed with **bcrypt** from day one.
- **JWT** bearer auth with role claims; `requireRole` middleware ready for full RBAC.
- **Zod** validation on every request body, query and param.
- Secrets via environment variables; `helmet` + configurable CORS.

---

## ✦ Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for a from-scratch guide
(recommended stack, env vars, SQLite→Postgres switch, image storage, domains,
SSL, and both a managed and an IIMA-server path). Google sign-in setup lives in
**[docs/GOOGLE_OAUTH_SETUP.md](docs/GOOGLE_OAUTH_SETUP.md)**.

In short:
- **Backend** → any Node host (Render, Railway, Fly.io). Set `DATABASE_URL` to a
  managed Postgres instance and flip the Prisma `provider` to `postgresql`.
- **Frontend** → Vercel. Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- **Images** → move the `/uploads` disk write to Cloudflare R2 / S3 before scaling.

---

## ✦ Contributing

1. Branch from `main`.
2. Keep the layered architecture — logic in services, thin controllers.
3. `npm run typecheck` (both apps) must pass; TypeScript is strict.
4. Match the existing design system; prefer spacing over decoration.

---

<div align="center">

Designed &amp; developed by **Ankur Kumar** for the
**Indian Institute of Management Ahmedabad**.

_Made with ♥ at IIM Ahmedabad._

</div>
