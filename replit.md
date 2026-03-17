# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: express-session + bcryptjs (cookie-based sessions)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── peace-power/        # React + Vite web app
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Peace Power App — Feature Overview

### What It Is
A humanitarian-themed mobile web app for measuring heart coherence using the phone camera as a PPG sensor (HeartMath-style). Part of a global peace initiative.

### Features
- **Landing page**: Global peace initiative messaging, sign in / register CTAs
- **User registration & login**: Cookie-based session auth, bcrypt password hashing
- **PPG scan**: 2-minute camera-based heart rate & HRV measurement, no hardware needed
- **Signal processing**: Detrending, smoothing, peak detection, RMSSD/SDNN, FFT-based coherence
- **Breathing pacer**: Animated inhale/exhale guide at ~6 breaths/min
- **Local + backend storage**: Results stored in localStorage AND synced to PostgreSQL

### Social Media Preview (March 17, 2026)
Added social media link preview for WhatsApp, Facebook, Twitter, and other platforms:
- Generated custom 1200×630px preview image with teal gradient, golden heart, and branding
- Updated `index.html` with Open Graph (og:image, og:title, og:description) and Twitter Card meta tags
- Image shows "Peace Power" with "Unite Through Heart Coherence" tagline
- Works on WhatsApp, Facebook, LinkedIn, Telegram, Twitter, and all major platforms

### Auth Flow Fix (March 16, 2026)
**Issue**: Users saw flash of "signed in" then redirected back to login on published app.
**Root cause**: Session cookie had `SameSite=none` in production (requires Secure + cross-site setup), but frontend and API are same-site behind proxy.
**Fix**: 
1. Changed `sameSite: "lax"` in production (line 23, `artifacts/api-server/src/app.ts`)
2. Added explicit `session.save()` before login/register responses (ensures session persists before client makes follow-up requests)
3. Increased React Query cache GC time to 5 minutes and use `setQueryData` on login/register (prevents cache eviction during page navigation)
- **Admin portal**: View all members, scan histories, coherence stats, grant/revoke admin roles
- **First user = admin**: The first registered user automatically gets admin access

### Pages / Routes
- `/` — Landing page (public)
- `/login` — Sign in
- `/register` — Join the movement
- `/dashboard` — Today's scans (authenticated)
- `/scan` — Live PPG scanning session (authenticated)
- `/history` — Scan history (authenticated)
- `/admin` — Admin portal (admin only)

### Database Schema
- `users` — id, name, email, password_hash, is_admin, created_at
- `scans` — id, user_id, heart_rate, rmssd, sdnn, coherence_score, coherence_level, quality, scanned_at, created_at

### API Endpoints (all under /api)
- `POST /auth/register` — Register new user
- `POST /auth/login` — Login
- `POST /auth/logout` — Logout
- `GET /auth/me` — Current user
- `POST /scans` — Submit scan result
- `GET /scans/me` — My scan history
- `GET /admin/members` — All members with stats (admin)
- `GET /admin/members/:id/scans` — Member scan history (admin)
- `GET /admin/stats` — Global stats (admin)
- `POST /admin/members/:id/set-admin` — Toggle admin role (admin)

## Packages

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server with session auth.

### `artifacts/peace-power` (`@workspace/peace-power`)
React + Vite mobile-first web app. Uses `@workspace/api-client-react` for typed API hooks.

### `lib/db` (`@workspace/db`)
Database layer using Drizzle ORM with PostgreSQL. Tables: users, scans.

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec. Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)
Generated Zod schemas.

### `lib/api-client-react` (`@workspace/api-client-react`)
Generated React Query hooks. Has `credentials: 'include'` set for cookie auth.
