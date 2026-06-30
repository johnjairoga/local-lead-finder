-- =============================================================================
-- Phase 4 — Approved Supabase schema
-- Migrates Phase 2 tables (PascalCase) → production snake_case tables.
-- Requires: Supabase Auth enabled (profiles.id → auth.users.id)
-- Do NOT run until .env points to the target Supabase project.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUMS
-- -----------------------------------------------------------------------------

CREATE TYPE "BusinessSource" AS ENUM ('GOOGLE_MAPS');

CREATE TYPE "SearchRunStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

-- BusinessStatus already exists from Phase 2 — reused by businesses.status

-- -----------------------------------------------------------------------------
-- 2. PROFILES
-- One row per authenticated Supabase user.
-- -----------------------------------------------------------------------------

CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "full_name" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profiles_id_fkey"
        FOREIGN KEY ("id") REFERENCES auth.users ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "profiles_email_idx" ON "profiles" ("email");

-- -----------------------------------------------------------------------------
-- 3. COLLECTIONS
-- Saved searches owned by a user.
-- -----------------------------------------------------------------------------

CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "search_term" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "min_rating" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "max_reviews" INTEGER NOT NULL DEFAULT 100,
    "latino_only" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "collections_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "profiles" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collections_min_rating_check" CHECK ("min_rating" >= 0 AND "min_rating" <= 5),
    CONSTRAINT "collections_max_reviews_check" CHECK ("max_reviews" >= 0)
);

CREATE UNIQUE INDEX "collections_user_id_search_term_location_key"
    ON "collections" ("user_id", "search_term", "location");

CREATE INDEX "collections_user_id_idx" ON "collections" ("user_id");
CREATE INDEX "collections_created_at_idx" ON "collections" ("created_at");

-- Migrate data from legacy "Collection" (requires a bootstrap profile — see note below)
-- NOTE: Before running data migration, insert at least one profile row for your user:
--   INSERT INTO profiles (id, email) VALUES ('<auth-user-uuid>', 'you@example.com');

INSERT INTO "collections" (
    "id",
    "user_id",
    "name",
    "search_term",
    "location",
    "min_rating",
    "max_reviews",
    "latino_only",
    "created_at",
    "updated_at"
)
SELECT
    c."id",
    (SELECT "id" FROM "profiles" LIMIT 1),
    c."name",
    c."searchTerm",
    c."location",
    COALESCE((c."filters"->>'minRating')::DOUBLE PRECISION, 4),
    COALESCE((c."filters"->>'maxReviews')::INTEGER, 100),
    COALESCE(jsonb_array_length(COALESCE(c."filters"->'requiredAttributes', '[]'::jsonb)) > 0, true),
    c."createdAt",
    c."updatedAt"
FROM "Collection" c
WHERE EXISTS (SELECT 1 FROM "profiles" LIMIT 1);

-- -----------------------------------------------------------------------------
-- 4. BUSINESSES
-- Global lead records; deduplicated by google_maps_url.
-- -----------------------------------------------------------------------------

CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "google_maps_url" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "city" TEXT,
    "country" TEXT,
    "rating" DOUBLE PRECISION NOT NULL,
    "reviews" INTEGER NOT NULL,
    "business_attributes" JSONB NOT NULL DEFAULT '[]',
    "status" "BusinessStatus" NOT NULL DEFAULT 'NEW',
    "source" "BusinessSource" NOT NULL DEFAULT 'GOOGLE_MAPS',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "businesses_google_maps_url_key" UNIQUE ("google_maps_url"),
    CONSTRAINT "businesses_rating_check" CHECK ("rating" >= 0 AND "rating" <= 5),
    CONSTRAINT "businesses_reviews_check" CHECK ("reviews" >= 0)
);

CREATE INDEX "businesses_name_idx" ON "businesses" ("name");
CREATE INDEX "businesses_phone_idx" ON "businesses" ("phone");
CREATE INDEX "businesses_email_idx" ON "businesses" ("email");
CREATE INDEX "businesses_city_idx" ON "businesses" ("city");
CREATE INDEX "businesses_country_idx" ON "businesses" ("country");
CREATE INDEX "businesses_status_idx" ON "businesses" ("status");
CREATE INDEX "businesses_last_seen_at_idx" ON "businesses" ("last_seen_at");
CREATE INDEX "businesses_source_idx" ON "businesses" ("source");

INSERT INTO "businesses" (
    "id",
    "name",
    "google_maps_url",
    "phone",
    "email",
    "rating",
    "reviews",
    "business_attributes",
    "status",
    "source",
    "created_at",
    "updated_at",
    "last_seen_at"
)
SELECT
    b."id",
    b."name",
    b."googleMapsUrl",
    b."phone",
    b."email",
    b."rating",
    b."reviews",
    b."businessAttributes",
    b."status",
    'GOOGLE_MAPS'::"BusinessSource",
    b."createdAt",
    b."updatedAt",
    b."lastSeenAt"
FROM "Business" b;

-- -----------------------------------------------------------------------------
-- 5. COLLECTION_BUSINESSES (pivot)
-- Many-to-many: which businesses belong to which collection.
-- -----------------------------------------------------------------------------

CREATE TABLE "collection_businesses" (
    "collection_id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_businesses_pkey"
        PRIMARY KEY ("collection_id", "business_id"),
    CONSTRAINT "collection_businesses_collection_id_fkey"
        FOREIGN KEY ("collection_id") REFERENCES "collections" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collection_businesses_business_id_fkey"
        FOREIGN KEY ("business_id") REFERENCES "businesses" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "collection_businesses_collection_id_idx"
    ON "collection_businesses" ("collection_id");

CREATE INDEX "collection_businesses_business_id_idx"
    ON "collection_businesses" ("business_id");

INSERT INTO "collection_businesses" ("collection_id", "business_id", "created_at")
SELECT cb."collectionId", cb."businessId", cb."firstSeenAt"
FROM "CollectionBusiness" cb
WHERE EXISTS (
    SELECT 1 FROM "collections" c WHERE c."id" = cb."collectionId"
)
AND EXISTS (
    SELECT 1 FROM "businesses" b WHERE b."id" = cb."businessId"
);

-- -----------------------------------------------------------------------------
-- 6. SEARCH_RUNS
-- One row per collection execution (replaces legacy "Job" table).
-- -----------------------------------------------------------------------------

CREATE TABLE "search_runs" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(3),
    "finished_at" TIMESTAMPTZ(3),
    "status" "SearchRunStatus" NOT NULL DEFAULT 'PENDING',
    "businesses_found" INTEGER NOT NULL DEFAULT 0,
    "new_businesses" INTEGER NOT NULL DEFAULT 0,
    "updated_businesses" INTEGER NOT NULL DEFAULT 0,
    "execution_time" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "search_runs_collection_id_fkey"
        FOREIGN KEY ("collection_id") REFERENCES "collections" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "search_runs_businesses_found_check" CHECK ("businesses_found" >= 0),
    CONSTRAINT "search_runs_new_businesses_check" CHECK ("new_businesses" >= 0),
    CONSTRAINT "search_runs_updated_businesses_check" CHECK ("updated_businesses" >= 0),
    CONSTRAINT "search_runs_execution_time_check" CHECK ("execution_time" IS NULL OR "execution_time" >= 0)
);

CREATE INDEX "search_runs_collection_id_idx" ON "search_runs" ("collection_id");
CREATE INDEX "search_runs_status_idx" ON "search_runs" ("status");
CREATE INDEX "search_runs_started_at_idx" ON "search_runs" ("started_at");
CREATE INDEX "search_runs_finished_at_idx" ON "search_runs" ("finished_at");

INSERT INTO "search_runs" (
    "id",
    "collection_id",
    "started_at",
    "finished_at",
    "status",
    "businesses_found",
    "new_businesses",
    "updated_businesses",
    "execution_time",
    "error_message",
    "created_at",
    "updated_at"
)
SELECT
    j."id",
    j."collectionId",
    j."startedAt",
    j."completedAt",
    j."status"::TEXT::"SearchRunStatus",
    j."businessesFound",
    j."newBusinessesAdded",
    j."businessesUpdated",
    j."executionTimeMs",
    j."errorMessage",
    j."createdAt",
    j."updatedAt"
FROM "Job" j
WHERE j."collectionId" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "collections" c WHERE c."id" = j."collectionId");

-- -----------------------------------------------------------------------------
-- 7. SYSTEM LOCK (unchanged purpose — job queue mutex)
-- -----------------------------------------------------------------------------

ALTER TABLE "SystemLock" RENAME TO "system_locks";
ALTER TABLE "system_locks" RENAME COLUMN "lockedAt" TO "locked_at";
ALTER TABLE "system_locks" RENAME COLUMN "lockedBy" TO "locked_by";

-- -----------------------------------------------------------------------------
-- 8. DROP LEGACY TABLES
-- -----------------------------------------------------------------------------

DROP TABLE IF EXISTS "CollectionBusiness";
DROP TABLE IF EXISTS "Collection";
DROP TABLE IF EXISTS "Business";
DROP TABLE IF EXISTS "Job";

-- Drop legacy enum if no longer referenced
DROP TYPE IF EXISTS "JobStatus";

-- -----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (Supabase — enable, policies added in Phase 5+)
-- -----------------------------------------------------------------------------

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "collections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "search_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "businesses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "collection_businesses" ENABLE ROW LEVEL SECURITY;

-- Placeholder policies: service role / Prisma bypass RLS when using service key.
-- Authenticated user policies should be added when Auth is wired in the app.

COMMENT ON TABLE "profiles" IS 'One profile per Supabase Auth user';
COMMENT ON TABLE "collections" IS 'Saved search configuration (niche + location + filters)';
COMMENT ON TABLE "search_runs" IS 'Execution history for a collection search';
COMMENT ON TABLE "businesses" IS 'Global deduplicated business leads';
COMMENT ON TABLE "collection_businesses" IS 'Pivot: businesses discovered in each collection';
COMMENT ON COLUMN "search_runs"."execution_time" IS 'Duration in milliseconds';
