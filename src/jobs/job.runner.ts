import { LeadFilter } from "@/filters/lead.filter";
import { logger } from "@/lib/logger";
import { getScraper } from "@/scraper";
import type { ScrapedBusiness } from "@/scraper/types";
import { ExportService } from "@/services/export.service";
import { LeadService } from "@/services/lead.service";
import { JobQueue } from "./job.queue";
import { JobRepository } from "./job.repository";
import { JobService } from "./job.service";
import { ScraperProcess } from "./scraper.process";

/**
 * Layer 3 — Central flow controller.
 *
 * Flow:
 * 1. Load job
 * 2. Run scraper (raw data)
 * 3. Pass to filter layer
 * 4. Persist via LeadService
 * 5. Mark job completed
 */
export class JobRunner {
  constructor(
    private readonly jobService: JobService,
    private readonly jobRepository: JobRepository,
    private readonly leadService: LeadService,
    private readonly leadFilter: LeadFilter,
    private readonly jobQueue: JobQueue
  ) {}

  async run(jobId: string): Promise<void> {
    const job = await this.jobRepository.findByIdOrThrow(jobId);

    if (job.status === "COMPLETED" || job.status === "CANCELLED") {
      logger.info("Job already finished, skipping", { jobId, status: job.status });
      return;
    }

    if (job.status === "PENDING") {
      await this.jobService.markRunning(jobId);
    } else if (job.status !== "RUNNING") {
      logger.warn("Job in unexpected state, skipping", { jobId, status: job.status });
      return;
    }

    try {
      const scraper = getScraper(job.provider);
      const rawBusinesses: ScrapedBusiness[] = [];

      await scraper.scrape(
        {
          searchTerm: job.searchTerm,
          location: job.location,
          maxResults: job.maxResults,
        },
        {
          onProgress: async ({ currentBusiness, processedCount, totalCount }) => {
            await this.jobService.updateProgress(jobId, {
              currentBusiness,
              processedCount,
              totalCount,
              qualifiedCount: 0,
            });
          },
          onBusinessExtracted: async (business) => {
            rawBusinesses.push(business);
          },
        }
      );

      const { qualified, duplicatesRemoved } = this.leadFilter.process(rawBusinesses);

      logger.info("Filtering complete", {
        jobId,
        raw: rawBusinesses.length,
        qualified: qualified.length,
        duplicatesRemoved,
      });

      await this.jobService.updateProgress(jobId, {
        qualifiedCount: qualified.length,
        processedCount: rawBusinesses.length,
        totalCount: rawBusinesses.length,
      });

      await this.leadService.saveForJob(jobId, qualified);
      await this.jobService.markCompleted(jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown job error";
      await this.jobService.markFailed(jobId, message);
    } finally {
      await this.jobQueue.processQueue();
    }
  }
}

export function createJobRunner(): JobRunner {
  const jobRepository = new JobRepository();
  const leadService = new LeadService();
  const exportService = new ExportService();
  const jobQueue = new JobQueue(jobRepository);
  const scraperProcess = new ScraperProcess(jobRepository);
  jobQueue.setScraperProcess(scraperProcess);
  const jobService = new JobService(jobRepository, leadService, exportService, jobQueue);
  const leadFilter = new LeadFilter();

  return new JobRunner(jobService, jobRepository, leadService, leadFilter, jobQueue);
}
