import type { JobStatus as PrismaJobStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { JobNotFoundError } from "@/lib/errors";
import type {
  CreateJobInput,
  JobProgress,
  JobRecord,
  JobStatus,
  ScraperProviderName,
} from "@/types/job";

function mapJob(record: {
  id: string;
  status: PrismaJobStatus;
  searchTerm: string;
  location: string;
  maxResults: number;
  provider: string;
  processedCount: number;
  totalCount: number;
  qualifiedCount: number;
  progress: number;
  currentBusiness: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}): JobRecord {
  return {
    id: record.id,
    status: record.status as JobStatus,
    searchTerm: record.searchTerm,
    location: record.location,
    maxResults: record.maxResults,
    provider: record.provider as ScraperProviderName,
    processedCount: record.processedCount,
    totalCount: record.totalCount,
    qualifiedCount: record.qualifiedCount,
    progress: record.progress,
    currentBusiness: record.currentBusiness,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
  };
}

export class JobRepository {
  async create(input: CreateJobInput): Promise<JobRecord> {
    const record = await prisma.job.create({
      data: {
        searchTerm: input.searchTerm,
        location: input.location,
        maxResults: input.maxResults,
        provider: input.provider ?? "google-maps",
        status: "PENDING",
      },
    });

    return mapJob(record);
  }

  async findById(id: string): Promise<JobRecord | null> {
    const record = await prisma.job.findUnique({ where: { id } });
    return record ? mapJob(record) : null;
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
    const record = await prisma.job.update({
      where: { id },
      data: {
        status: status as PrismaJobStatus,
        errorMessage: extra?.errorMessage,
        startedAt: extra?.startedAt,
        completedAt: extra?.completedAt,
      },
    });

    return mapJob(record);
  }

  async updateProgress(
    id: string,
    data: {
      currentBusiness?: string | null;
      processedCount?: number;
      totalCount?: number;
      qualifiedCount?: number;
      progress?: number;
    }
  ): Promise<JobRecord> {
    const record = await prisma.job.update({
      where: { id },
      data,
    });

    return mapJob(record);
  }

  async countRunningJobs(): Promise<number> {
    return prisma.job.count({ where: { status: "RUNNING" } });
  }

  async recoverStuckJobs(stuckMinutes: number): Promise<number> {
    const cutoff = new Date(Date.now() - stuckMinutes * 60 * 1000);

    const result = await prisma.job.updateMany({
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

  /**
   * Atomically claims PENDING jobs one at a time to prevent duplicate dispatch.
   */
  async claimNextJobs(maxConcurrent: number): Promise<JobRecord[]> {
    const runningCount = await this.countRunningJobs();
    const slots = maxConcurrent - runningCount;
    if (slots <= 0) return [];

    const claimed: JobRecord[] = [];

    for (let i = 0; i < slots; i++) {
      const job = await prisma.$transaction(async (tx) => {
        const pending = await tx.job.findFirst({
          where: { status: "PENDING" },
          orderBy: { createdAt: "asc" },
        });

        if (!pending) return null;

        const updated = await tx.job.updateMany({
          where: { id: pending.id, status: "PENDING" },
          data: {
            status: "RUNNING",
            startedAt: new Date(),
            errorMessage: null,
          },
        });

        if (updated.count === 0) return null;

        return tx.job.findUnique({ where: { id: pending.id } });
      });

      if (!job) break;
      claimed.push(mapJob(job));
    }

    return claimed;
  }

  async tryAcquireQueueLock(lockTtlMs: number, lockedBy: string): Promise<boolean> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - lockTtlMs);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.systemLock.findUnique({
        where: { id: "JOB_QUEUE" },
      });

      if (existing && existing.lockedAt > cutoff) {
        return false;
      }

      await tx.systemLock.upsert({
        where: { id: "JOB_QUEUE" },
        create: { id: "JOB_QUEUE", lockedAt: now, lockedBy },
        update: { lockedAt: now, lockedBy },
      });

      return true;
    });
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
