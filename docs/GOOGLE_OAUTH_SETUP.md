# Enabling Google Sign-In (@iima.ac.in only)

The app is already wired for Google sign-in. Until you add a **Client ID** it
runs in **dev mock mode** (a plain `@iima.ac.in` email box on the login page).
Follow these steps to turn on real Google authentication.

## How it works (architecture)

```
Browser (Google button)  ──ID token──▶  Backend /auth/google
                                          │  verifies token with Google
                                          │  checks email ends with @iima.ac.in
                                          │  finds/creates the user
                                          ▼
                                        our JWT  ──▶  used for all API calls
```

The Google **Client ID is not a secret** — it's safe in the browser. We never
need the client *secret* because the backend only *verifies* the ID token
(using `google-auth-library`) rather than running a server-side code exchange.

## Step 1 — Create the OAuth Client ID

1. Go to <https://console.cloud.google.com/> and create (or pick) a project.
2. **APIs & Services → OAuth consent screen**
   - User type: **Internal** if `iima.ac.in` is a Google Workspace org you
     manage (this alone restricts sign-in to the org). Otherwise **External**.
   - Fill app name, support email (`p26ankur@iima.ac.in`), developer email.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins:**
     - `http://localhost:3000` (development)
     - `https://your-production-domain` (when deployed)
   - Authorized redirect URIs: *not required* for Google Identity Services.
4. Copy the **Client ID** (looks like `xxxx.apps.googleusercontent.com`).

## Step 2 — Set the environment variables

**Backend** (`backend/.env`):

```
GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com"
```

**Frontend** (`frontend/.env.local`):

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

Both must be the **same** value. Restart both servers.

## Step 3 — Verify

- The login page now shows the real Google button (the dev email box disappears).
- `GET /api/v1/auth/config` returns `{ "googleEnabled": true }`.
- Signing in with a non-`@iima.ac.in` Google account is rejected with 403.

## Restricting to @iima.ac.in — two layers

1. **Consent screen = Internal** (Workspace) blocks other orgs at Google's side.
2. **Backend check** (always on): `findOrCreateInstituteUser` rejects any email
   that doesn't end with `@iima.ac.in`. This is the guarantee even if the
   consent screen is External.

## Notes

- New Google users land on **/onboarding** to complete their profile
  (name, batch, hostel, WhatsApp, privacy prefs) before entering the marketplace.
- Existing password test accounts still work via the "Use a test account" link
  on the login page — handy for QA. Remove that block before a public launch if
  you want Google-only.
