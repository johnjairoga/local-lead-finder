# Deployment Checklist — Local Lead Finder AI

Use this file every time you deploy to a new environment (staging, production, VPS, Railway, etc.).
Check off each item before going live.

---

## 1. Supabase Project Setup

### 1.1 Create / verify the project
- [ ] Project exists at https://supabase.com/dashboard
- [ ] Note the **Project Ref** (e.g. `dypkxkuyfggdapahbdgc`) — used in all connection strings

### 1.2 Database schema
- [ ] Run migrations on the target Supabase project:
  ```bash
  npx prisma migrate deploy
  ```
  > If the DB is fresh and you get P3005, use `npx prisma db push` only once, then switch back to `migrate deploy` for all future changes.

### 1.3 Auth — Redirect URLs ⚠️ CRITICAL
Go to **Supabase Dashboard → Authentication → URL Configuration**

- [ ] Add `Site URL`:
  ```
  https://YOUR_PRODUCTION_DOMAIN.com
  ```
- [ ] Add to `Redirect URLs` (one per line):
  ```
  http://localhost:3000/auth/callback        ← local dev
  https://YOUR_PRODUCTION_DOMAIN.com/auth/callback   ← production
  ```
  > Without this, email confirmation and OAuth logins will fail with a redirect error.

### 1.4 Auth — First user
- [ ] Create at least one user in **Supabase → Authentication → Users → Invite user**
  - Or let users self-register via the `/login` page (Sign up tab)
- [ ] Copy that user's UUID → set `SUPABASE_DEFAULT_USER_ID` in production env vars
  (needed for background scraper jobs that run without an HTTP session)

### 1.5 Auth — Email confirmation (optional)
- [ ] In **Supabase → Authentication → Providers → Email** decide:
  - **Confirm email: ON** → users must verify email before logging in (recommended for production)
  - **Confirm email: OFF** → users log in immediately (ok for internal/private tools)

---

## 2. Environment Variables

Copy `.env.example` to `.env` on every machine/server and fill in all values.

| Variable | Where to find it | Required |
|----------|-----------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | ✅ |
| `DATABASE_URL` | Supabase → Project Settings → Database → Transaction pooler (port **6543**) | ✅ |
| `DIRECT_URL` | Supabase → Project Settings → Database → Direct connection (port **5432**) | ✅ |
| `SUPABASE_DEFAULT_USER_ID` | Supabase → Authentication → Users → copy UUID | ✅ |
| `NODE_ENV` | Set to `production` on server | ✅ |
| `RESULTS_DIR` | Folder path for export files | ✅ |
| `PLAYWRIGHT_BROWSERS_PATH` | Path to installed Chromium (Windows only) | Windows only |

> ⚠️ **Never commit `.env` to Git.** Only `.env.example` belongs in the repo.

### Validate env vars locally before deploying:
```bash
node -e "require('./scripts/test-supabase-connection.mjs')"
```

---

## 3. Playwright / Scraper

- [ ] Chromium is installed on the server:
  ```bash
  npx playwright install chromium
  ```
- [ ] On Linux servers add `--no-sandbox` flags (already handled in `scraper.process.ts`)
- [ ] On Windows: set `PLAYWRIGHT_BROWSERS_PATH` in `.env` if Chromium is not on PATH

---

## 4. Build & Start

```bash
# Install dependencies
npm install

# Generate Prisma client + build Next.js
npm run build

# Start production server
npm start
```

> On Railway / Vercel / Render: these commands run automatically from `package.json`.

---

## 5. Railway-specific (if deploying to Railway)

- [ ] Create a new Railway project → Deploy from GitHub repo
- [ ] Add all environment variables in **Railway → Variables** (same as `.env`)
- [ ] Railway detects Next.js automatically (`npm run build` + `npm start`)
- [ ] Add a custom domain in **Railway → Settings → Networking → Custom Domain**
- [ ] After setting custom domain: update Supabase **Redirect URLs** with new domain (step 1.3)
- [ ] **Do not** add `DATABASE_URL` pointing to Railway Postgres — use Supabase pooler URL

---

## 6. Post-deploy Smoke Test

- [ ] Open `https://YOUR_DOMAIN.com` → should redirect to `/login`
- [ ] Sign in with a valid user → should land on `/dashboard`
- [ ] Create a new search → scraper runs → results appear
- [ ] Change a business contact status → dropdown saves correctly
- [ ] Sign out → redirects to `/login` ✅

---

## 7. Ongoing Maintenance

### Adding a schema change (new column, table, etc.)
```bash
# Create the migration locally
npx prisma migrate dev --name describe_your_change

# Deploy to production (does NOT reset data)
npx prisma migrate deploy
```
> ❌ Avoid `prisma db push --accept-data-loss` in production — it can drop tables.

### Adding a new user
- Supabase Dashboard → Authentication → Users → Invite user
- Or enable self-registration on the `/login` Sign up form

### Rotating Supabase keys
1. Generate new keys in Supabase → Project Settings → API
2. Update env vars in your host (Railway / VPS / etc.)
3. Restart the app
4. Old keys immediately stop working — update `.env` locally too

### Backing up the database (Free plan has no automatic backups)
```bash
# Run this weekly / before any migration
pg_dump "YOUR_DIRECT_URL" -f backup-$(date +%Y-%m-%d).sql
```
Or use [SimpleBackups](https://simplebackups.com) for automated off-site backups.

---

## 8. Quick Reference — Key URLs

| Resource | URL |
|----------|-----|
| Supabase Dashboard | https://supabase.com/dashboard/project/dypkxkuyfggdapahbdgc |
| Supabase Auth Users | https://supabase.com/dashboard/project/dypkxkuyfggdapahbdgc/auth/users |
| Supabase URL Config | https://supabase.com/dashboard/project/dypkxkuyfggdapahbdgc/auth/url-configuration |
| GitHub Repo | https://github.com/johnjairoga/local-lead-finder |

---

_Last updated: 2026-06-30_
