# LatamEasy

Production-ready MVP for discovering qualified local businesses from Google Maps.

## Architecture (3 Layers)

```text
┌─────────────────────────────────────────────────────────┐
│  API Routes (thin controllers)                            │
│  POST /api/search  →  container.jobService              │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  Layer 3: Job System (src/jobs/)                        │
│  JobService → JobQueue → ScraperProcess (spawn worker)    │
│  JobRunner orchestrates: scrape → filter → persist        │
└───────┬──────────────────────────────┬────────────────────┘
        │                              │
┌───────▼──────────────┐    ┌──────────▼───────────────────┐
│ Layer 1: Scraper     │    │ Layer 2: Filters             │
│ src/scraper/         │    │ src/filters/                 │
│ Raw data only        │───▶│ Business rules + dedup       │
│ No filtering         │    │ No Playwright, no DB         │
└──────────────────────┘    └──────────┬───────────────────┘
                                       │
                            ┌──────────▼───────────────────┐
                            │ Services (src/services/)     │
                            │ LeadService → PostgreSQL     │
                            │ ExportService → results/*.json│
                            └──────────────────────────────┘
```

## Project Structure

```text
src/
  app/                    # Next.js pages + thin API routes
  components/             # UI components
  scraper/                # Layer 1 — Data Collection
    providers/GoogleMaps/
    main.ts               # Worker entry point
  filters/                # Layer 2 — Business Logic
    lead.filter.ts
    deduplicator.ts
  jobs/                   # Layer 3 — Orchestration
    job.service.ts
    job.runner.ts
    job.queue.ts
    job.repository.ts
    scraper.process.ts
  services/               # Persistence helpers
    lead.service.ts
    export.service.ts
  lib/                    # Infrastructure (db, logger, DI)
  types/                  # Shared TypeScript contracts
prisma/                   # Database schema
```

## Production Hardening (Railway-safe MVP)

- **Stuck job recovery** on server boot (`STUCK_JOB_MINUTES`, default 10)
- **Atomic job claiming** via `claimNextJobs()` (`UPDATE WHERE status = PENDING`)
- **Idle dispatcher loop** every `QUEUE_POLL_INTERVAL_MS` (default 5s)
- **DB queue lock** (`SystemLock`) to reduce multi-instance races
- **Spawn exit tracking** — failed workers mark job `FAILED` and re-dispatch queue
- **Keep `MAX_CONCURRENT_JOBS=1`** on Railway (Playwright memory)

Run migration after pull (uses Supabase `DIRECT_URL`):

```bash
npx prisma migrate deploy
```

## Database (Supabase)

This project uses **Supabase PostgreSQL** as the only database. Local PostgreSQL is not used.

| Variable | Source | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | Supabase → Database → **Transaction** pooler (6543) | App runtime (Prisma) |
| `DIRECT_URL` | Supabase → Database → **Direct** (5432) | Migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API | Public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API | Server-side key |

```bash
cp .env.example .env
# Fill in Supabase credentials, then:
npm run db:migrate
npm run dev
```

Windows quick start:

```powershell
npm run start:supabase
```

## Flow

1. API creates Job (`PENDING`)
2. JobQueue dispatches worker via `child_process.spawn`
3. JobRunner calls `GoogleMapsScraper` → raw `ScrapedBusiness[]`
4. `LeadFilter.process()` → qualified leads (dedup + rules)
5. `LeadService.saveForJob()` → PostgreSQL
6. Job marked `COMPLETED` + JSON export

## Job States

`PENDING` → `RUNNING` → `COMPLETED` | `FAILED` | `CANCELLED`

## Environment (production)

| Variable | Default | Purpose |
|----------|---------|---------|
| `MAX_CONCURRENT_JOBS` | `1` | Keep at 1 on Railway (Playwright memory) |
| `STUCK_JOB_MINUTES` | `10` | Reset stale `RUNNING` jobs to `PENDING` |
| `QUEUE_POLL_INTERVAL_MS` | `5000` | Idle dispatcher interval |
| `QUEUE_LOCK_TTL_MS` | `10000` | DB lock TTL for multi-instance safety |

## Quick Start

```bash
cp .env.example .env
# Add Supabase credentials to .env
npm install
npm run db:migrate
npx playwright install chromium
npm run dev
```

## Docker

Requires `.env` with Supabase credentials (connects to cloud DB, no local Postgres):

```bash
docker compose up --build
```

## Adding New Scrapers

1. Create `src/scraper/providers/Yelp/`
2. Implement `Scraper` interface from `src/scraper/providers/base.scraper.ts`
3. Register in `src/scraper/providers/index.ts`

No changes needed to filters, jobs, or API.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/search` | Create job |
| GET | `/api/jobs/{id}` | Status + leads |
| GET | `/api/jobs/{id}/download` | JSON export |
