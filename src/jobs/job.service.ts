import { ValidationError } from "@/lib/errors";
import { STUCK_JOB_MINUTES } from "@/lib/constants";
import { logger } from "@/lib/logger";import { ExportService } from "@/services/export.service";
import { LeadService } from "@/services/lead.service";
import type { CreateJobInput, JobProgress, JobRecord } from "@/types/job";
import type { Lead } from "@/types/lead";
import { JobQueue } from "./job.queue";
import { JobRepository } from "./job.repository";

/**
 * Layer 3 — Job orchestration service.
 * Manages job lifecycle, progress, and coordinates exports.
 */
export class JobService {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly leadService: LeadService,
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
  }

  async createAndEnqueue(input: CreateJobInput): Promise<JobRecord> {
    this.validateSearchInput(input);

    const job = await this.jobRepository.create(input);
    logger.info("Job created", { jobId: job.id });

    await this.jobQueue.enqueue(job);
    return job;
  }

  async getJobWithLeads(jobId: string): Promise<{
    job: JobRecord;
    progress: JobProgress;
    leads: Lead[];
  }> {
    const job = await this.jobRepository.findByIdOrThrow(jobId);
    const leads = await this.leadService.getByJobId(jobId);
    const progress = this.jobRepository.toProgress(job);

    return { job, progress, leads };
  }

  async markRunning(jobId: string): Promise<JobRecord> {
    return this.jobRepository.updateStatus(jobId, "RUNNING", {
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

  async markCompleted(jobId: string): Promise<JobRecord> {
    const job = await this.jobRepository.updateStatus(jobId, "COMPLETED", {
      completedAt: new Date(),
      errorMessage: null,
    });

    const leads = await this.leadService.getByJobId(jobId);
    await this.exportService.exportJob(job, leads);

    logger.info("Job completed", { jobId, leadCount: leads.length });
    return job;
  }

  async markFailed(jobId: string, errorMessage: string): Promise<JobRecord> {
    logger.error("Job failed", { jobId, errorMessage });
    return this.jobRepository.updateStatus(jobId, "FAILED", {
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
