# DEPLOYMENT.md

Operational and deployment guide for **saascope-api**.

This document is derived directly from the source code (`src/`), `package.json`,
`tsconfig.json`, `database/schema.sql`, the middleware/route/config layers, and the
local `.env`. Where the `README.md` disagrees with the actual code, **this document
follows the code** and calls out the discrepancy.

---

## 1. Project Overview

### Purpose

`saascope-api` is a backend API for **SaaS spend visibility**. Users upload a CSV
export of their software subscriptions and the API returns structured cost-optimization
insights (inactive licenses, duplicate vendors, multi-seat overpayment) along with
estimated monthly savings. Results are persisted as **reports**, each with a full
**event timeline**, and surfaced through a **dashboard summary** endpoint.

The processing pipeline (per upload):

1. Authenticate the request (JWT Bearer).
2. Accept a single CSV file (`multipart/form-data`, field name `file`).
3. Persist a `report` row immediately with status `processing`.
4. Parse + validate the CSV (header validation, row validation).
5. Run the deterministic insight engine + savings aggregation.
6. Persist results and mark the report `completed` (or `failed` on error).
7. Record `report_events` at every stage for auditability and retry.

### Tech Stack (as built)

| Layer            | Choice                          | Source of truth |
|------------------|---------------------------------|-----------------|
| Runtime          | Node.js                         | `package.json`, `tsc` build |
| Language         | TypeScript (target `ES2020`, module `CommonJS`) | `tsconfig.json` |
| Framework        | Express **5** (`express@^5.2.1`) | `package.json`, `src/server.ts` |
| Database         | PostgreSQL via `pg` Pool        | `src/config/db.ts` |
| DB host (prod)   | Supabase Postgres               | `.env`, `src/config/db.ts` DNS probe |
| Auth             | JWT (stateless, `jsonwebtoken`) + `bcrypt` password hashing | `src/services/token.service.ts`, `src/services/auth.service.ts` |
| File upload      | `multer` (disk storage)         | `src/middlewares/upload.middleware.ts` |
| CSV parsing      | `csv-parse`                     | `src/services/csv.parser.ts` |
| Logging          | `pino` + `pino-http` (+ `pino-pretty` transport) | `src/utils/logger.ts`, `src/server.ts` |
| Rate limiting    | `express-rate-limit` (in-memory) | `src/middlewares/rate-limit.middleware.ts` |
| Request IDs      | `uuid`                          | `src/middlewares/request-id.middleware.ts` |
| Hosting (target) | **Railway**                     | recent commits, `0.0.0.0` bind, SSL config |

> **README discrepancy:** `README.md` lists the hosting layer as "Render" and shows a
> `/api/v1/...` API prefix. The actual code targets **Railway + Supabase** and mounts
> routes at the **root** (`/upload`, `/reports`, `/auth`, `/dashboard`). Trust the code.

### Key Dependencies (runtime)

`express`, `pg`, `jsonwebtoken`, `bcrypt`, `multer`, `csv-parse`, `cors`,
`express-rate-limit`, `pino`, `pino-http`, `uuid`, `dotenv`.

### Key Dependencies (dev / build-time)

`typescript`, `ts-node-dev`, `pino-pretty`, and the `@types/*` packages.

> ⚠️ **Production-critical:** `pino-pretty` is a **devDependency**, but
> `src/utils/logger.ts` loads it unconditionally as the pino transport — in **all**
> environments, including production. If devDependencies are not installed at runtime,
> the server crashes on boot. See [§7](#7-production-troubleshooting).

---

## 2. Environment Variables

All variables are read via `process.env` (loaded by `dotenv.config()` in
`src/server.ts`). The table below lists **every variable referenced in code**, plus
variables present in `.env` that are **not currently consumed**.

### Variables consumed by the code

| Variable | Required | Default | Used in | What it does |
|----------|----------|---------|---------|--------------|
| `DATABASE_URL` | **Yes** | — | `src/config/db.ts` | Postgres connection string for the `pg` Pool. No default; connection fails without it. |
| `JWT_SECRET` | **Yes** | — | `auth.middleware.ts`, `token.service.ts` | Secret for signing/verifying JWTs. **The process throws at startup if missing** (both modules `throw new Error(...)` on import). Use ≥32 chars. |
| `NODE_ENV` | Recommended | `development` (effective) | `db.ts`, `server.ts` | When `=== "production"`, enables Postgres SSL (`{ rejectUnauthorized: false }`). Any other value disables SSL. Also labels the startup log. |
| `PORT` | No | `3000` | `server.ts` | Port the HTTP server binds to. Railway injects this automatically — do not hardcode. |
| `JWT_EXPIRES_IN` | No | `7d` | `token.service.ts` | Token lifetime passed to `jwt.sign`. |
| `LOG_LEVEL` | No | `info` | `utils/logger.ts` | pino log level (`trace`/`debug`/`info`/`warn`/`error`/`fatal`). |
| `INACTIVE_THRESHOLD_DAYS` | No | `90` | `report-processor.service.ts` | Age (days) after which an unused license is flagged `inactive`. |
| `DUPLICATE_COST_MINIMUM` | No | `1` | `report-processor.service.ts` | Minimum cost floor for duplicate-vendor insights. **Note:** code default is `1`; README says `0`. |
| `FRONTEND_URL` | No | — | `server.ts` | Pushed onto an `allowedOrigins` array — **but that array is currently unused** (see warning below). Functionally inert today. |
| `TEST_FAILURE` | No (test only) | — | `report-processor.service.ts` | When `=== "true"`, forces processing to throw. **Never set this in production.** |

> ⚠️ **CORS reality check:** `src/server.ts` builds `allowedOrigins` (localhost +
> `FRONTEND_URL`) and logs it, but the actual CORS middleware is configured as
> `cors({ origin: true, credentials: true })`. `origin: true` **reflects every request
> origin** — so CORS is effectively wide open and `FRONTEND_URL` has **no effect** on
> what is allowed. If you need to restrict origins, you must change the `cors()` config
> to use the `allowedOrigins` array. Documented here so prod behavior is not a surprise.

### Variables present in `.env` but NOT consumed by code

| Variable | Status |
|----------|--------|
| `MAX_FILE_SIZE_MB` | Ignored. The upload size limit is **hardcoded to 10 MB** in `upload.middleware.ts` (`10 * 1024 * 1024`). |
| `UPLOAD_TEMP_DIR` | Ignored. Upload destination is **hardcoded to `storage/uploads`** in `upload.middleware.ts`. |

### `.env.production` template

```env
# ---------- Server ----------
NODE_ENV=production
# PORT is injected by Railway automatically — do NOT set it manually in prod.

# ---------- Database (Supabase / Postgres) ----------
# Use the Supabase connection string. SSL is auto-enabled because NODE_ENV=production.
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres

# ---------- Auth ----------
# Generate with: openssl rand -hex 32   (min 32 chars)
JWT_SECRET=__CHANGE_ME__min_32_char_random_secret__
JWT_EXPIRES_IN=7d

# ---------- Insight thresholds ----------
INACTIVE_THRESHOLD_DAYS=90
DUPLICATE_COST_MINIMUM=1

# ---------- Logging ----------
LOG_LEVEL=info

# ---------- Optional ----------
# FRONTEND_URL currently has no effect on CORS (origin: true reflects all origins).
# FRONTEND_URL=https://app.example.com

# Do NOT set TEST_FAILURE in production.
```

---

## 3. Local Development Setup

### Requirements

- Node.js (no `engines` field is pinned; LTS 18+ recommended — `@types/node@^25`, Express 5).
- PostgreSQL 14+ (or a Supabase project).

### Installation

```bash
git clone <repo-url>
cd saascope-api
npm install
```

### Configure environment

Create a `.env` in the project root (it is gitignored). Minimum viable local config:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/saascope
JWT_SECRET=local_dev_secret_at_least_32_characters_long
JWT_EXPIRES_IN=7d
INACTIVE_THRESHOLD_DAYS=90
DUPLICATE_COST_MINIMUM=1
LOG_LEVEL=debug
```

> With `NODE_ENV=development`, Postgres SSL is **disabled** (`ssl: false`). This is
> correct for a local Postgres but will fail against Supabase, which requires SSL — see
> [§4](#4-database).

### Database setup

There is **no migration tool and no `npm run migrate` script** (the README references
one, but `package.json` has only `dev`, `build`, `start`). Apply the schema manually:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

`database/schema.sql` creates: the `pgcrypto` extension, and tables `users`,
`reports`, `report_events`, plus supporting indexes. See [§4](#4-database).

### Run locally (dev)

```bash
npm run dev      # ts-node-dev --respawn src/server.ts (hot reload)
```

### Run locally (production build)

```bash
npm run build    # tsc → compiles src/ to dist/
npm start        # node dist/server.js
```

The server binds to `0.0.0.0:${PORT}` and logs `Server started successfully`.

### Common local troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Process exits immediately: `JWT_SECRET is not configured` / `not defined` | `JWT_SECRET` missing | Set `JWT_SECRET` in `.env`. It is validated at import time. |
| `Database connection failed` in console | Bad `DATABASE_URL`, DB down, or SSL mismatch | Verify the URL; for Supabase set `NODE_ENV=production` so SSL turns on. |
| Uploads fail with no file error | Wrong form field name | The field **must** be named `file` (`upload.single("file")`). |
| `dist/server.js` not found on `npm start` | Forgot to build | Run `npm run build` first (`dist/` is gitignored). |
| Logger/transport error on boot | `pino-pretty` not installed | Run a full `npm install` (it is a devDependency). |

---

## 4. Database

### Engine

PostgreSQL, accessed through a single `pg.Pool` defined in `src/config/db.ts`:

```ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});
```

On startup the pool runs `SELECT 1` and logs `Database connected` or
`Database connection failed`. There is also a **diagnostic DNS probe** in `db.ts` that
resolves `aws-1-ap-south-1.pooler.supabase.com` and logs the result — this is a
deployment diagnostic and does not affect the live connection (which uses
`DATABASE_URL`).

### Supabase / PostgreSQL setup

1. Create a PostgreSQL database (Supabase project, Railway Postgres plugin, or self-hosted).
2. Apply the schema:
   ```bash
   psql "$DATABASE_URL" -f database/schema.sql
   ```
3. Confirm the three tables exist: `users`, `reports`, `report_events`.

### Schema requirements

From `database/schema.sql`:

- **Extension:** `pgcrypto` (provides `gen_random_uuid()` used for all primary keys).
- **`users`** — `id (uuid pk)`, `email (unique, not null)`, `password_hash (not null)`, `created_at`.
- **`reports`** — `id (uuid pk)`, `created_at`, `file_name`, `processed_count`,
  `skipped_count`, `errors (jsonb)`, `vendors (jsonb)`, `total_savings (numeric)`,
  `user_id (fk → users.id)`, `status (default 'processing', not null)`, `file_path`.
- **`report_events`** — `id (uuid pk)`, `report_id (fk → reports.id ON DELETE CASCADE)`,
  `event_type (not null)`, `metadata (jsonb)`, `created_at`.
- **Indexes:** `idx_users_email`, `idx_reports_user_id`, `idx_report_events_report_id`.

> Note: `report_events` cascades on report delete, but `reports.user_id` does **not**
> cascade from `users`. The `status` column drives the retry flow (only `failed`
> reports can be retried). `file_path` stores the on-disk path of the uploaded CSV and
> is required for retry — see the ephemeral-storage warning in [§5](#5-railway-deployment).

### SSL requirements

- **Production (`NODE_ENV=production`):** SSL is **on** with `rejectUnauthorized: false`.
  This is required for Supabase and most managed Postgres providers.
- **Non-production:** SSL is **off**. Pointing a non-production process at Supabase will
  fail the TLS handshake.

### Common `DATABASE_URL` mistakes

| Mistake | Result | Correct form |
|---------|--------|--------------|
| Using a Supabase URL with `NODE_ENV` ≠ `production` | TLS/connection error (SSL disabled in code) | Set `NODE_ENV=production` to enable SSL. |
| Missing/empty `DATABASE_URL` | Pool has no `connectionString`; `SELECT 1` fails, `Database connection failed` logged | Always set it. |
| Mixing direct vs. pooler host/port | Connection refused or pool exhaustion | Use the host/port Supabase gives you (direct `:5432`, or the pooler endpoint with its own port). The code's DNS probe references the pooler host but the live connection uses whatever is in `DATABASE_URL`. |
| Special characters in password not URL-encoded | Parse/auth failure | URL-encode `@`, `:`, `/`, etc. in the password. |
| Wrong database name | `database "..." does not exist` | Supabase default DB is `postgres`. |

---

## 5. Railway Deployment

The repo contains **no `railway.json`, `Procfile`, `nixpacks.toml`, or `Dockerfile`**.
Railway therefore auto-detects a Node project via Nixpacks and uses the npm scripts.

### Deployment process

1. Create a Railway project and connect this GitHub repo (deploys on push to the
   configured branch, currently `main`).
2. Add the environment variables (see below) under **Variables**.
3. Provision Postgres — either Railway's Postgres plugin or an external Supabase DB.
4. Apply `database/schema.sql` to that database once (via `psql` or the provider's SQL console).
5. Deploy. Railway runs install → build → start.

### Build command

```
npm run build        # = tsc  (compiles src/ → dist/)
```

Nixpacks runs `npm install` (or `npm ci`) first. The build needs the **devDependencies**
`typescript`, the `@types/*` packages — and the runtime needs `pino-pretty` (also a
devDependency). **Do not let the install step prune devDependencies.**

> ⚠️ **The pino-pretty / NODE_ENV trap.** If `NODE_ENV=production` is present during
> `npm install`, npm omits devDependencies. That breaks the build (`tsc` missing) and/or
> the runtime (`pino-pretty` missing → server crashes on boot with a pino transport
> error). Mitigations, pick one:
> - Let Railway install all deps (default Nixpacks behavior installs dev deps for the
>   build) and only set `NODE_ENV=production` as a **runtime** variable; **or**
> - Move `pino-pretty` to `dependencies`; **or**
> - Make the pino transport conditional on `NODE_ENV` so production logs raw JSON
>   without `pino-pretty`.
> The most robust fix is moving `pino-pretty` into `dependencies`.

### Start command

```
npm start            # = node dist/server.js
```

### Port configuration

- The server binds to `Number(process.env.PORT)` on host `0.0.0.0`
  (`app.listen(Number(PORT), "0.0.0.0", ...)`), defaulting to `3000`.
- **Railway injects `PORT` automatically.** Do **not** set `PORT` yourself in Railway —
  binding to `0.0.0.0` and reading the injected `PORT` is exactly what Railway requires.

### Networking configuration

- Binding to `0.0.0.0` (not `127.0.0.1`/`localhost`) is required so Railway's proxy can
  reach the container. This is already done in `src/server.ts`.
- Railway provides a public domain; generate one under the service's **Networking /
  Settings** to expose the API.

### Required environment variables on Railway

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` (enables Postgres SSL) |
| `DATABASE_URL` | Postgres/Supabase connection string |
| `JWT_SECRET` | ≥32-char random secret (server refuses to start without it) |
| `JWT_EXPIRES_IN` | e.g. `7d` (optional) |
| `INACTIVE_THRESHOLD_DAYS` | e.g. `90` (optional) |
| `DUPLICATE_COST_MINIMUM` | e.g. `1` (optional) |
| `LOG_LEVEL` | e.g. `info` (optional) |
| `PORT` | **Do not set** — injected by Railway |

> ⚠️ **Ephemeral filesystem.** Uploaded CSVs are written to `storage/uploads` on local
> disk (`multer.diskStorage`), and `reports.file_path` points there. Railway containers
> have **ephemeral** storage that is wiped on every redeploy/restart. Consequence:
> **retrying a `failed` report** (`POST /reports/:id/retry`) reads the original file from
> disk and will fail if that file no longer exists after a redeploy. For durable
> retries you would need object storage (e.g. S3) — not implemented today.

---

## 6. API Health Checks

All routes are mounted at the **root** (no `/api/v1` prefix). Auth-protected routes
require an `Authorization: Bearer <token>` header.

### Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/` | No | Health check → `{ "message": "SaaScope API is running" }` |
| `GET` | `/ping` | No | Liveness → `pong` (plain text) |
| `GET` | `/test-db` | No | DB connectivity → runs `SELECT NOW()`, returns rows (**diagnostic; consider removing in prod**) |
| `POST` | `/auth/register` | No | Register (`{ email, password }`, password ≥8 chars) |
| `POST` | `/auth/login` | No | Login → `{ token, user }` |
| `GET` | `/protected` | Yes | Demo auth check → echoes `req.user` (**demo route**) |
| `POST` | `/upload` | Yes | Upload CSV (`multipart/form-data`, field `file`); rate-limited 20/15min/IP |
| `GET` | `/reports` | Yes | List reports (query: `page`, `limit` 1–50, `search`, `minSavings`) |
| `GET` | `/reports/:id` | Yes | Get one report |
| `GET` | `/reports/:id/events` | Yes | Get a report's event timeline |
| `POST` | `/reports/:id/retry` | Yes | Reprocess a `failed` report |
| `DELETE` | `/reports/:id` | Yes | Delete a report (cascades events) → `204` |
| `GET` | `/dashboard/summary` | Yes | Aggregated dashboard summary |

> The `/test-db`, `/ping`, and `/protected` routes are explicitly labeled as TEMP/demo
> in `src/server.ts`. They are safe for health-checking but `/test-db` exposes DB error
> messages and should be removed or guarded before a hardened production launch.

### Testing commands

```bash
# Liveness
curl https://<your-app>.up.railway.app/ping
# → pong

# Health
curl https://<your-app>.up.railway.app/
# → {"message":"SaaScope API is running"}

# DB connectivity
curl https://<your-app>.up.railway.app/test-db
# → [{"now":"2026-..."}]

# Register
curl -X POST https://<your-app>.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"supersecret"}'

# Login (capture token)
curl -X POST https://<your-app>.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"supersecret"}'

# Authenticated upload
curl -X POST https://<your-app>.up.railway.app/upload \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@subscriptions.csv"

# List reports
curl "https://<your-app>.up.railway.app/reports?page=1&limit=10" \
  -H "Authorization: Bearer <TOKEN>"
```

CSV required headers: `vendorName`, `cost`, `seats`, `billingCycle` (optional:
`lastUsedDate`) — from `src/constants/csv.ts`.

### Verification checklist

- [ ] `GET /ping` returns `pong`.
- [ ] `GET /` returns the running message.
- [ ] `GET /test-db` returns a timestamp row (DB reachable + SSL correct).
- [ ] `POST /auth/register` then `POST /auth/login` returns a JWT.
- [ ] An authenticated `POST /upload` with a valid CSV returns `reportId` + insights.
- [ ] `GET /reports` lists the new report; `GET /reports/:id/events` shows the timeline.
- [ ] Startup logs show `Database connected` and `Server started successfully`.

---

## 7. Production Troubleshooting

### Server crashes on boot

| Log / symptom | Meaning | Fix |
|---------------|---------|-----|
| `Error: JWT_SECRET is not configured` / `JWT_SECRET is not defined in environment variables` | `JWT_SECRET` missing; validated at module import in `auth.middleware.ts` / `token.service.ts` | Set `JWT_SECRET` (≥32 chars). |
| pino transport error mentioning `pino-pretty` | `pino-pretty` (devDependency) not installed at runtime — usually because `NODE_ENV=production` pruned dev deps at install | Move `pino-pretty` to `dependencies`, or don't set `NODE_ENV=production` during install, or make the transport conditional. See [§5](#5-railway-deployment). |
| Build fails: `tsc: not found` / missing `@types/*` | devDependencies pruned before build | Same root cause/fix as above. |

### CORS issues

- Current config is `cors({ origin: true, credentials: true })` → **all origins are
  reflected and allowed.** If you are seeing CORS errors with this config, the failure
  is almost certainly **not** CORS (check the network tab for the real status/error).
- `FRONTEND_URL` does **not** restrict or whitelist origins today (the computed
  `allowedOrigins` array is unused). To actually lock down origins, wire `allowedOrigins`
  into the `cors()` `origin` option.
- Note: `origin: true` with `credentials: true` reflects the caller's origin (rather than
  `*`), which is what allows credentialed requests to work.

### JWT issues

| Response | Meaning | Fix |
|----------|---------|-----|
| `401 {"error":"Authorization token required"}` | No `Authorization` header | Send `Authorization: Bearer <token>`. |
| `401 {"error":"Invalid authorization format"}` | Header not exactly `Bearer <token>` (two space-separated parts) | Fix the header format. |
| `401 {"error":"Invalid or expired token"}` | `jwt.verify` failed — expired, wrong secret, or tampered | Re-login; ensure the **same `JWT_SECRET`** is used by the instance that signed and the one verifying. |
| All tokens suddenly invalid after deploy | `JWT_SECRET` changed between deploys | Keep `JWT_SECRET` stable; rotating it invalidates all existing tokens. |

### Database connection issues

| Log / symptom | Meaning | Fix |
|---------------|---------|-----|
| `Database connection failed` on boot | `SELECT 1` failed | Verify `DATABASE_URL`, DB reachability, credentials. |
| TLS/SSL handshake error against Supabase | SSL disabled because `NODE_ENV` ≠ `production` | Set `NODE_ENV=production`. |
| `self signed certificate` errors | Provider cert not trusted | Code already uses `rejectUnauthorized: false` in production — ensure `NODE_ENV=production`. |
| `relation "users"/"reports" does not exist` | Schema not applied | Run `psql "$DATABASE_URL" -f database/schema.sql`. |
| `function gen_random_uuid() does not exist` | `pgcrypto` extension missing | The schema creates it; ensure the full `schema.sql` ran. |
| Connection count exhausted | Too many pool connections vs. Supabase limits | Use the Supabase pooler endpoint in `DATABASE_URL`. |

### Railway deployment failures

- **Build succeeds but app crash-loops:** almost always the `pino-pretty` devDependency
  issue above, or a missing `JWT_SECRET`. Check the deploy logs for the first error line.
- **App builds but is unreachable / 502:** ensure the server binds `0.0.0.0` (it does)
  and that you did **not** override `PORT` — Railway must inject it.
- **`dist/server.js` not found at start:** the build step didn't run or failed; confirm
  `npm run build` is the build command and produced `dist/`.
- **Retry endpoint fails in prod after a redeploy:** ephemeral storage wiped the original
  upload referenced by `reports.file_path`. See [§5](#5-railway-deployment).

### Common log messages and their meaning

These come from the pino logger / `console.log` statements in the code:

| Message | Source | Meaning |
|---------|--------|---------|
| `SERVER FILE LOADED` | `server.ts` | Module loaded (very early boot). |
| `DATABASE URL: ...://***@...` | `db.ts` | Connection string loaded (password masked). |
| `Database connected` | `db.ts` | `SELECT 1` succeeded. |
| `Database connection failed` | `db.ts` | Pool could not connect — followed by the error. |
| `DNS TEST` + addresses/err | `db.ts` | Diagnostic DNS resolution of the Supabase pooler host. |
| `ALLOWED ORIGINS: [...]` | `server.ts` | The computed (currently unused) CORS origins list. |
| `PORT ENV:` / `FRONTEND_URL:` | `server.ts` | Echoes those env values at boot. |
| `Server started successfully` | `server.ts` | HTTP server is listening. |
| `Health check route accessed` | `server.ts` | `GET /` was hit. |
| `Database connectivity test successful/failed` | `server.ts` | `GET /test-db` result. |
| `CSV upload started` / `... processed successfully` | `upload.controller.ts` | Upload lifecycle. |
| `CSV rows skipped during validation` | `upload.controller.ts` | Some rows failed validation (see `errors`). |
| `CSV upload rejected due to invalid headers` | `upload.controller.ts` | Required headers missing → `400`. |
| `EVENT CREATED: report_created / processing_started / processing_completed` | services | Report event timeline writes. |
| `Authentication attempted without authorization header` / `Malformed authorization header` / `JWT authentication failed` | `auth.middleware.ts` | Auth rejections. |

---

## 8. Release Process

### Build verification (before deploy)

```bash
npm ci                 # clean, reproducible install (uses package-lock.json)
npm run build          # tsc must complete with no errors → dist/ produced
node dist/server.js    # smoke test: expect "Database connected" + "Server started successfully"
```

- [ ] `tsc` compiles cleanly (project is `"strict": true`).
- [ ] `dist/server.js` exists and starts.
- [ ] App boots with `NODE_ENV=production` against a staging DB (confirms SSL + deps).
- [ ] `pino-pretty` resolves at runtime (no transport error) — verify with a
      production-like install (devDeps not present) if you intend to prune them.

### Deployment verification (after deploy)

- [ ] `GET /ping` → `pong`.
- [ ] `GET /test-db` → timestamp row (DB + SSL OK).
- [ ] Register → login → receive JWT.
- [ ] Authenticated `POST /upload` with a sample CSV → `reportId` + insights.
- [ ] `GET /reports` and `GET /reports/:id/events` reflect the upload.
- [ ] Logs show `Database connected` and `Server started successfully`, no crash loop.

### Production checklist

- [ ] `JWT_SECRET` set (≥32 chars), stable across deploys, not the placeholder value.
- [ ] `NODE_ENV=production` (enables Postgres SSL).
- [ ] `DATABASE_URL` points at the production/Supabase DB; schema applied.
- [ ] `PORT` **not** set manually (Railway injects it).
- [ ] `TEST_FAILURE` **unset** (or `false`).
- [ ] `pino-pretty` available at runtime (moved to `dependencies`, or devDeps installed).
- [ ] CORS reviewed — current config allows all origins; restrict if required.
- [ ] Diagnostic/demo routes (`/test-db`, `/protected`) reviewed/removed for hardened prod.
- [ ] Aware of ephemeral storage: report **retry** depends on the on-disk CSV surviving;
      it will not survive redeploys without external storage.
- [ ] Secrets are configured in Railway Variables, not committed (`.env*` is gitignored).

---

### Appendix: README vs. code discrepancies (intentional, for clarity)

| README says | Code actually does |
|-------------|--------------------|
| Hosting: Render | Targets Railway + Supabase |
| API prefix `/api/v1/...` | Routes mounted at root (`/upload`, `/reports`, `/auth`, `/dashboard`) |
| `npm run migrate` | No such script; apply `database/schema.sql` manually |
| Data model: `Upload`, `UploadError`, `SaaSRecord`, `Insight` tables | Actual tables: `users`, `reports`, `report_events` |
| `DUPLICATE_COST_MINIMUM=0` | Code default is `1` |
| `MAX_FILE_SIZE_MB`, `UPLOAD_TEMP_DIR` configurable | Hardcoded (10 MB, `storage/uploads`) |
