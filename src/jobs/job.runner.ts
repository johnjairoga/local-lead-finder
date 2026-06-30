import { LeadFilter } from "@/filters/lead.filter";
import { logger } from "@/lib/logger";
import { getScraper } from "@/scraper";
import type { ScrapedBusiness } from "@/scraper/types";
import { BusinessService, CollectionService } from "@/services/business.service";
import { ExportService } from "@/services/export.service";
import { JobStatus } from "@/types/job";
import { JobQueue } from "./job.queue";
import { JobRepository } from "./job.repository";
import { JobService } from "./job.service";
import { ScraperProcess } from "./scraper.process";

/**
 * Layer 3 — Central flow controller.
 *
 * Flow:
 * 1. Load search run + collection filters
 * 2. Run scraper (raw data)
 * 3. Pass to filter layer
 * 4. Upsert businesses into lead database
 * 5. Mark search run completed
 */
export class JobRunner {
  constructor(
    private readonly jobService: JobService,
    private readonly jobRepository: JobRepository,
    private readonly businessService: BusinessService,
    private readonly collectionService: CollectionService,
    private readonly jobQueue: JobQueue
  ) {}

  async run(jobId: string): Promise<void> {
    const job = await this.jobRepository.findByIdOrThrow(jobId);
    const runStartedAt = Date.now();

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.CANCELLED) {
      logger.info("Search run already finished, skipping", { jobId, status: job.status });
      return;
    }

    if (job.status === JobStatus.PENDING) {
      await this.jobService.markRunning(jobId);
    } else if (job.status !== JobStatus.RUNNING) {
      logger.warn("Search run in unexpected state, skipping", { jobId, status: job.status });
      return;
    }

    if (!job.collectionId) {
      await this.jobService.markFailed(jobId, "Search run is missing a collection");
      return;
    }

    try {
      const collection = await this.collectionService.getById(job.collectionId);
      if (!collection) {
        await this.jobService.markFailed(jobId, "Collection not found");
        return;
      }

      const leadFilter = new LeadFilter(collection.filters);
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

      const { qualified, duplicatesRemoved } = leadFilter.process(rawBusinesses);

      logger.info("Filtering complete", {
        jobId,
        raw: rawBusinesses.length,
        qualified: qualified.length,
        duplicatesRemoved,
      });

      const discovery = await this.businessService.upsertFromSearchRun(
        job.collectionId,
        qualified
      );

      const executionTimeMs = Date.now() - runStartedAt;
      const businesses = await this.businessService.getByCollectionId(job.collectionId);

      await this.jobService.updateProgress(jobId, {
        qualifiedCount: qualified.length,
        processedCount: rawBusinesses.length,
        totalCount: rawBusinesses.length,
        businessesFound: discovery.businessesFound,
        newBusinessesAdded: discovery.newBusinessesAdded,
        businessesUpdated: discovery.businessesUpdated,
        executionTimeMs,
      });

      await this.jobService.markCompleted(
        jobId,
        { ...discovery, executionTimeMs },
        businesses
      );
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
  const businessService = new BusinessService();
  const collectionService = new CollectionService();
  const exportService = new ExportService();
  const jobQueue = new JobQueue(jobRepository);
  const scraperProcess = new ScraperProcess(jobRepository);
  jobQueue.setScraperProcess(scraperProcess);
  const jobService = new JobService(
    jobRepository,
    businessService,
    collectionService,
    exportService,
    jobQueue
  );

  return new JobRunner(
    jobService,
    jobRepository,
    businessService,
    collectionService,
    jobQueue
  );
}
