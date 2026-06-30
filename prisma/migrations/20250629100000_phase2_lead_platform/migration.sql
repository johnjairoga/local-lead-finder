-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CLIENT', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "searchTerm" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "googleMapsUrl" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "rating" DOUBLE PRECISION NOT NULL,
    "reviews" INTEGER NOT NULL,
    "businessAttributes" JSONB NOT NULL DEFAULT '[]',
    "status" "BusinessStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionBusiness" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionBusiness_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "collectionId" TEXT,
ADD COLUMN "businessesFound" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "newBusinessesAdded" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "businessesUpdated" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "executionTimeMs" INTEGER;

-- Drop Lead table (replaced by Business)
DROP TABLE IF EXISTS "Lead";

-- CreateIndex
CREATE UNIQUE INDEX "Collection_searchTerm_location_key" ON "Collection"("searchTerm", "location");
CREATE INDEX "Collection_createdAt_idx" ON "Collection"("createdAt");
CREATE UNIQUE INDEX "Business_googleMapsUrl_key" ON "Business"("googleMapsUrl");
CREATE INDEX "Business_status_idx" ON "Business"("status");
CREATE INDEX "Business_lastSeenAt_idx" ON "Business"("lastSeenAt");
CREATE UNIQUE INDEX "CollectionBusiness_collectionId_businessId_key" ON "CollectionBusiness"("collectionId", "businessId");
CREATE INDEX "CollectionBusiness_collectionId_idx" ON "CollectionBusiness"("collectionId");
CREATE INDEX "CollectionBusiness_businessId_idx" ON "CollectionBusiness"("businessId");
CREATE INDEX "Job_collectionId_idx" ON "Job"("collectionId");

-- AddForeignKey
ALTER TABLE "CollectionBusiness" ADD CONSTRAINT "CollectionBusiness_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollectionBusiness" ADD CONSTRAINT "CollectionBusiness_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
