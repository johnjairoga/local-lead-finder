-- Phase 4 contact workflow: expand BusinessStatus enum for lead outreach tracking

CREATE TYPE "BusinessStatus_new" AS ENUM (
  'NEW',
  'NOT_CONTACTED',
  'CONTACTED',
  'NOT_INTERESTED',
  'INTERESTED',
  'CLIENT'
);

-- Migrate legacy "Business" table (Phase 2) if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Business'
  ) THEN
    ALTER TABLE "Business" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "Business" ALTER COLUMN "status" TYPE "BusinessStatus_new" USING (
      CASE "status"::text
        WHEN 'NEW' THEN 'NEW'::"BusinessStatus_new"
        WHEN 'CONTACTED' THEN 'CONTACTED'::"BusinessStatus_new"
        WHEN 'QUALIFIED' THEN 'INTERESTED'::"BusinessStatus_new"
        WHEN 'CLIENT' THEN 'CLIENT'::"BusinessStatus_new"
        WHEN 'ARCHIVED' THEN 'NOT_INTERESTED'::"BusinessStatus_new"
        ELSE 'NEW'::"BusinessStatus_new"
      END
    );
    ALTER TABLE "Business" ALTER COLUMN "status" SET DEFAULT 'NEW'::"BusinessStatus_new";
  END IF;
END $$;

-- Migrate "businesses" table (Phase 4) if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'businesses'
  ) THEN
    ALTER TABLE "businesses" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "businesses" ALTER COLUMN "status" TYPE "BusinessStatus_new" USING (
      CASE "status"::text
        WHEN 'NEW' THEN 'NEW'::"BusinessStatus_new"
        WHEN 'CONTACTED' THEN 'CONTACTED'::"BusinessStatus_new"
        WHEN 'QUALIFIED' THEN 'INTERESTED'::"BusinessStatus_new"
        WHEN 'CLIENT' THEN 'CLIENT'::"BusinessStatus_new"
        WHEN 'ARCHIVED' THEN 'NOT_INTERESTED'::"BusinessStatus_new"
        ELSE 'NEW'::"BusinessStatus_new"
      END
    );
    ALTER TABLE "businesses" ALTER COLUMN "status" SET DEFAULT 'NEW'::"BusinessStatus_new";
  END IF;
END $$;

DROP TYPE IF EXISTS "BusinessStatus";
ALTER TYPE "BusinessStatus_new" RENAME TO "BusinessStatus";

COMMENT ON TYPE "BusinessStatus" IS 'Lead contact / outreach status for businesses';
