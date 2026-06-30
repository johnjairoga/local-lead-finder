import type { SearchRunStatus as PrismaSearchRunStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { JobNotFoundError } from "@/lib/errors";
import type {
  CreateJobInput,
  JobProgress,
  JobRecord,
  JobStatus,
  ScraperProviderName,
} from "@/types/job";

type RunMetadata = {
  processedCount?: number;
  totalCount?: number;
  qualifiedCount?: number;
  progress?: number;
  currentBusiness?: string | null;
  maxResults?: number;
  provider?: string;
  searchTerm?: string;
  location?: string;
  businessIds?: string[];
};

function parseMetadata(value: unknown): RunMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as RunMetadata;
}

function mapSearchRun(
  record: {
    id: string;
    status: PrismaSearchRunStatus;
    collectionId: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    businessesFound: number;
    newBusinesses: number;
    updatedBusinesses: number;
    executionTime: number | null;
    errorMessage: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
    collection: {
      searchTerm: string;
      location: string;
      maxReviews: number;
    } | null;
  }
): JobRecord {
  const meta = parseMetadata(record.metadata);

  return {
    id: record.id,
    status: record.status as JobStatus,
    collectionId: record.collectionId,
    // collection takes priority; fall back to metadata for public (no-collection) runs
    searchTerm: record.collection?.searchTerm ?? meta.searchTerm ?? "",
    location: record.collection?.location ?? meta.location ?? "",
    maxResults: meta.maxResults ?? 50,
    provider: (meta.provider as ScraperProviderName) ?? "google-maps",
    processedCount: meta.processedCount ?? 0,
    totalCount: meta.totalCount ?? 0,
    qualifiedCount: meta.qualifiedCount ?? 0,
    businessesFound: record.businessesFound,
    newBusinessesAdded: record.newBusinesses,
    businessesUpdated: record.updatedBusinesses,
    executionTimeMs: record.executionTime,
    progress: meta.progress ?? 0,
    currentBusiness: meta.currentBusiness ?? null,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    startedAt: record.startedAt,
    completedAt: record.finishedAt,
  };
}

const runInclude = {
  collection: {
    select: { searchTerm: true, location: true, maxReviews: true },
  },
} as const;

// Helper to read business IDs stored in metadata for public search runs
export function getBusinessIdsFromMetadata(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const m = metadata as Record<string, unknown>;
  return Array.isArray(m.businessIds) ? (m.businessIds as string[]) : [];
}

export class JobRepository {
  async create(input: CreateJobInput): Promise<JobRecord> {
    const metadata: RunMetadata = {
      maxResults: input.maxResults,
      provider: input.provider ?? "google-maps",
      searchTerm: input.searchTerm,
      location: input.location,
      processedCount: 0,
      totalCount: 0,
      qualifiedCount: 0,
      progress: 0,
    };

    const record = await prisma.searchRun.create({
      data: {
        collectionId: input.collectionId ?? null,
        status: "PENDING",
        metadata,
      },
      include: runInclude,
    });

    return mapSearchRun(record);
  }

  async getRawMetadata(id: string): Promise<unknown> {
    const record = await prisma.searchRun.findUnique({ where: { id }, select: { metadata: true } });
    return record?.metadata ?? {};
  }

  async findById(id: string): Promise<JobRecord | null> {
    const record = await prisma.searchRun.findUnique({
      where: { id },
      include: runInclude,
    });
    return record ? mapSearchRun(record) : null;
  }

  async findByIdOrThrow(id: string): Promise<JobRecord> {
    const job = await this.findById(id);
    if (!job) throw new JobNotFoundError(id);
    return job;
  }

  async updateStatus(
    id: string,
    status: JobStatus,
    extra?: {
      errorMessage?: string | null;
      startedAt?: Date;
      completedAt?: Date;
    }
  ): Promise<JobRecord> {
    const record = await prisma.searchRun.update({
      where: { id },
      data: {
        status: status as PrismaSearchRunStatus,
        errorMessage: extra?.errorMessage,
        startedAt: extra?.startedAt,
        finishedAt: extra?.completedAt,
      },
      include: runInclude,
    });

    return mapSearchRun(record);
  }

  async updateProgress(
    id: string,
    data: {
      currentBusiness?: string | null;
      processedCount?: number;
      totalCount?: number;
      qualifiedCount?: number;
      businessesFound?: number;
      newBusinessesAdded?: number;
      businessesUpdated?: number;
      executionTimeMs?: number;
      progress?: number;
      businessIds?: string[];
    }
  ): Promise<JobRecord> {
    const existing = await prisma.searchRun.findUnique({ where: { id } });
    const meta = parseMetadata(existing?.metadata);

    const record = await prisma.searchRun.update({
      where: { id },
      data: {
        businessesFound: data.businessesFound,
        newBusinesses: data.newBusinessesAdded,
        updatedBusinesses: data.businessesUpdated,
        executionTime: data.executionTimeMs,
        metadata: {
          ...meta,
          currentBusiness: data.currentBusiness ?? meta.currentBusiness,
          processedCount: data.processedCount ?? meta.processedCount,
          totalCount: data.totalCount ?? meta.totalCount,
          qualifiedCount: data.qualifiedCount ?? meta.qualifiedCount,
          progress: data.progress ?? meta.progress,
          ...(data.businessIds !== undefined ? { businessIds: data.businessIds } : {}),
        },
      },
      include: runInclude,
    });

    return mapSearchRun(record);
  }

  async countRunningJobs(): Promise<number> {
    return prisma.searchRun.count({ where: { status: "RUNNING" } });
  }

  async recoverStuckJobs(stuckMinutes: number): Promise<number> {
    const cutoff = new Date(Date.now() - stuckMinutes * 60 * 1000);

    const result = await prisma.searchRun.updateMany({
      where: {
        status: "RUNNING",
        OR: [
          { startedAt: { lt: cutoff } },
          { startedAt: null, updatedAt: { lt: cutoff } },
        ],
      },
      data: {
        status: "PENDING",
        startedAt: null,
        errorMessage: "Recovered from stuck RUNNING state",
      },
    });

    return result.count;
  }

  async claimNextJobs(maxConcurrent: number): Promise<JobRecord[]> {
    const runningCount = await this.countRunningJobs();
    const slots = maxConcurrent - runningCount;
    if (slots <= 0) return [];

    const claimed: JobRecord[] = [];

    for (let i = 0; i < slots; i++) {
      // Find a pending job then optimistically claim it — no interactive
      // transaction so it works with PgBouncer in transaction-pooling mode.
      const pending = await prisma.searchRun.findFirst({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: runInclude,
      });

      if (!pending) break;

      const updated = await prisma.searchRun.updateMany({
        where: { id: pending.id, status: "PENDING" },
        data: { status: "RUNNING", startedAt: new Date(), errorMessage: null },
      });

      if (updated.count === 0) break; // Another worker claimed it first

      const job = await prisma.searchRun.findUnique({
        where: { id: pending.id },
        include: runInclude,
      });

      if (job) claimed.push(mapSearchRun(job));
    }

    return claimed;
  }

  async tryAcquireQueueLock(lockTtlMs: number, lockedBy: string): Promise<boolean> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - lockTtlMs);

    // Non-transactional lock — safe for single-instance deployments and
    // compatible with PgBouncer transaction pooling.
    const existing = await prisma.systemLock.findUnique({
      where: { id: "JOB_QUEUE" },
    });

    if (existing && existing.lockedAt > cutoff) return false;

    try {
      await prisma.systemLock.upsert({
        where: { id: "JOB_QUEUE" },
        create: { id: "JOB_QUEUE", lockedAt: now, lockedBy },
        update: { lockedAt: now, lockedBy },
      });
      return true;
    } catch {
      return false;
    }
  }

  async releaseQueueLock(): Promise<void> {
    await prisma.systemLock
      .delete({ where: { id: "JOB_QUEUE" } })
      .catch(() => undefined);
  }

  toProgress(job: JobRecord): JobProgress {
    return {
      status: job.status,
      currentBusiness: job.currentBusiness,
      processed: job.processedCount,
      total: job.totalCount,
      qualified: job.qualifiedCount,
      progress: job.progress,
    };
  }
}
