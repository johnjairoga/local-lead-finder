import { ValidationError } from "@/lib/errors";
import { STUCK_JOB_MINUTES } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { ExportService } from "@/services/export.service";
import { BusinessService, CollectionService } from "@/services/business.service";
import type { CreateJobInput, DiscoverySummary, JobProgress, JobRecord } from "@/types/job";
import { JobStatus } from "@/types/job";
import type { Business } from "@/types/business";
import { JobQueue } from "./job.queue";
import { JobRepository } from "./job.repository";

/**
 * Layer 3 — Job orchestration service (Search Runs).
 */
export class JobService {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly businessService: BusinessService,
    private readonly collectionService: CollectionService,
    private readonly exportService: ExportService,
    private readonly jobQueue: JobQueue
  ) {}

  validateSearchInput(input: CreateJobInput): void {
    if (!input.searchTerm?.trim()) {
      throw new ValidationError("Search term is required");
    }
    if (!input.location?.trim()) {
      throw new ValidationError("Location is required");
    }
    if (!input.maxResults || input.maxResults < 1 || input.maxResults > 200) {
      throw new ValidationError("Maximum results must be between 1 and 200");
    }
    if (!input.collectionId) {
      throw new ValidationError("Collection is required");
    }
  }

  async createAndEnqueue(input: CreateJobInput): Promise<JobRecord> {
    this.validateSearchInput(input);

    const job = await this.jobRepository.create(input);
    logger.info("Search run created", { jobId: job.id, collectionId: job.collectionId });

    await this.jobQueue.enqueue(job);
    return job;
  }

  async getJobWithDiscovery(jobId: string): Promise<{
    job: JobRecord;
    progress: JobProgress;
    discovery: DiscoverySummary;
    businesses: Business[];
  }> {
    const job = await this.jobRepository.findByIdOrThrow(jobId);
    const progress = this.jobRepository.toProgress(job);
    const discovery: DiscoverySummary = {
      businessesFound: job.businessesFound,
      newBusinessesAdded: job.newBusinessesAdded,
      businessesUpdated: job.businessesUpdated,
      executionTimeMs: job.executionTimeMs,
    };

    const businesses =
      job.collectionId && job.status === JobStatus.COMPLETED
        ? await this.businessService.getByCollectionId(job.collectionId)
        : [];

    return { job, progress, discovery, businesses };
  }

  async markRunning(jobId: string): Promise<JobRecord> {
    return this.jobRepository.updateStatus(jobId, JobStatus.RUNNING, {
      startedAt: new Date(),
    });
  }

  async updateProgress(
    jobId: string,
    data: {
      currentBusiness?: string | null;
      processedCount?: number;
      totalCount?: number;
      qualifiedCount?: number;
      businessesFound?: number;
      newBusinessesAdded?: number;
      businessesUpdated?: number;
      executionTimeMs?: number;
    }
  ): Promise<JobRecord> {
    const processed = data.processedCount ?? 0;
    const total = data.totalCount ?? 0;
    const progress = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

    return this.jobRepository.updateProgress(jobId, {
      ...data,
      progress,
    });
  }

  async markCompleted(
    jobId: string,
    discovery: DiscoverySummary,
    businesses: Business[]
  ): Promise<JobRecord> {
    const job = await this.jobRepository.findByIdOrThrow(jobId);
    const executionTimeMs =
      discovery.executionTimeMs ??
      (job.startedAt ? Date.now() - job.startedAt.getTime() : null);

    const completed = await this.jobRepository.updateProgress(jobId, {
      businessesFound: discovery.businessesFound,
      newBusinessesAdded: discovery.newBusinessesAdded,
      businessesUpdated: discovery.businessesUpdated,
      executionTimeMs: executionTimeMs ?? undefined,
    });

    const finalJob = await this.jobRepository.updateStatus(completed.id, JobStatus.COMPLETED, {
      completedAt: new Date(),
      errorMessage: null,
    });

    await this.exportService.exportSearchRun(finalJob, businesses, discovery);

    logger.info("Search run completed", {
      jobId,
      ...discovery,
      executionTimeMs,
    });

    return finalJob;
  }

  async markFailed(jobId: string, errorMessage: string): Promise<JobRecord> {
    logger.error("Search run failed", { jobId, errorMessage });
    return this.jobRepository.updateStatus(jobId, JobStatus.FAILED, {
      completedAt: new Date(),
      errorMessage,
    });
  }

  async getExportContent(jobId: string): Promise<string> {
    await this.jobRepository.findByIdOrThrow(jobId);
    return this.exportService.readExport(jobId);
  }

  async recoverStuckJobs(stuckMinutes: number = STUCK_JOB_MINUTES): Promise<number> {
    const count = await this.jobRepository.recoverStuckJobs(stuckMinutes);
    if (count > 0) {
      logger.warn("Recovered stuck jobs", { count, stuckMinutes });
    }
    return count;
  }
}
