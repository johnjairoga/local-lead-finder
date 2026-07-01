import { LeadFilter } from "@/filters/lead.filter";
import { DEFAULT_SEARCH_FILTERS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { getScraper } from "@/scraper";
import type { ScrapedBusiness } from "@/scraper/types";
import { BusinessService, CollectionService } from "@/services/business.service";
import { ExportService } from "@/services/export.service";
import { JobStatus } from "@/types/job";
import { JobQueue } from "./job.queue";
import { JobRepository, getSkipNamesFromMetadata } from "./job.repository";
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

    try {
      // Resolve filters: from collection if available, else use defaults
      let leadFilter: LeadFilter;
      if (job.collectionId) {
        const collection = await this.collectionService.getById(job.collectionId);
        if (!collection) {
          await this.jobService.markFailed(jobId, "Collection not found");
          return;
        }
        leadFilter = new LeadFilter(collection.filters);
      } else {
        leadFilter = new LeadFilter(DEFAULT_SEARCH_FILTERS);
      }

      const scraper = getScraper(job.provider);
      const rawBusinesses: ScrapedBusiness[] = [];

      // Load skip-names from metadata (set by expanded searches to avoid re-scraping)
      const rawMeta = await this.jobRepository.getRawMetadata(jobId);
      const skipNames = getSkipNamesFromMetadata(rawMeta);
      const skipSet = skipNames.length > 0 ? new Set(skipNames) : undefined;

      if (skipSet?.size) {
        logger.info("Expanded search: will skip already-processed businesses", {
          jobId,
          skipCount: skipSet.size,
        });
      }

      await scraper.scrape(
        {
          searchTerm: job.searchTerm,
          location: job.location,
          maxResults: job.maxResults,
          skipNames: skipSet,
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

      let discovery;
      let businesses;
      let businessIds: string[] | undefined;

      if (job.collectionId) {
        // Authenticated run: save to collection
        discovery = await this.businessService.upsertFromSearchRun(job.collectionId, qualified);
        businesses = await this.businessService.getByCollectionId(job.collectionId);
      } else {
        // Public run: save globally, track IDs in metadata
        const { result, ids } = await this.businessService.upsertPublic(qualified);
        discovery = result;
        businessIds = ids;
        businesses = await this.businessService.getByIds(ids);
      }

      const executionTimeMs = Date.now() - runStartedAt;

      await this.jobService.updateProgress(jobId, {
        qualifiedCount: qualified.length,
        processedCount: rawBusinesses.length,
        totalCount: rawBusinesses.length,
        businessesFound: discovery.businessesFound,
        newBusinessesAdded: discovery.newBusinessesAdded,
        businessesUpdated: discovery.businessesUpdated,
        executionTimeMs,
        businessIds,
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
