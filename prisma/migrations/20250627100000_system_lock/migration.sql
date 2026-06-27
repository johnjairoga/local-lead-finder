-- CreateTable
CREATE TABLE "SystemLock" (
    "id" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL,
    "lockedBy" TEXT,

    CONSTRAINT "SystemLock_pkey" PRIMARY KEY ("id")
);
