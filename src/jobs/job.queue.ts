import {
  MAX_CONCURRENT_JOBS,
  QUEUE_LOCK_TTL_MS,
  QUEUE_POLL_INTERVAL_MS,
  STUCK_JOB_MINUTES,
} from "@/lib/constants";
import { logger } from "@/lib/logger";
import type { JobRecord } from "@/types/job";
import { JobRepository } from "./job.repository";
import { ScraperProcess } from "./scraper.process";

/**
 * DB-backed dispatcher with atomic claim + idle poll loop.
 * Swap for BullMQ when scaling beyond a single instance.
 */
export class JobQueue {
  private processing = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly lockOwner = `pid-${process.pid}`;
  private scraperProcess: ScraperProcess | null = null;

  constructor(
    private readonly jobRepository: JobRepository,
    scraperProcess: ScraperProcess | null = null,
    private readonly maxConcurrent: number = MAX_CONCURRENT_JOBS
  ) {
    this.scraperProcess = scraperProcess;
  }

  setScraperProcess(scraperProcess: ScraperProcess): void {
    this.scraperProcess = scraperProcess;
  }

  start(pollIntervalMs: number = QUEUE_POLL_INTERVAL_MS): void {
    if (this.intervalId) return;

    logger.info("Job queue dispatcher started", { pollIntervalMs, maxConcurrent: this.maxConcurrent });

    this.intervalId = setInterval(() => {
      void this.processQueue();
    }, pollIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async enqueue(job: JobRecord): Promise<void> {
    logger.info("Job enqueued", { jobId: job.id });
    await this.processQueue();
  }

  async processQueue(): Promise<void> {
    if (this.processing) return;

    const lockAcquired = await this.jobRepository.tryAcquireQueueLock(
      QUEUE_LOCK_TTL_MS,
      this.lockOwner
    );

    if (!lockAcquired) return;

    this.processing = true;

    try {
      if (!this.scraperProcess) {
        logger.error("ScraperProcess not configured");
        return;
      }

      const recovered = await this.jobRepository.recoverStuckJobs(STUCK_JOB_MINUTES);
      if (recovered > 0) {
        logger.warn("Recovered stuck jobs during queue poll", { recovered });
      }

      const jobs = await this.jobRepository.claimNextJobs(this.maxConcurrent);

      for (const job of jobs) {
        this.scraperProcess.spawn(job.id);
        logger.info("Job dispatched to worker", { jobId: job.id });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Queue processing failed", { error: message });
    } finally {
      this.processing = false;
      await this.jobRepository.releaseQueueLock();
    }
  }
}
