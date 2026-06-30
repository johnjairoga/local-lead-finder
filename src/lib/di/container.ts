import { JobRepository } from "@/jobs/job.repository";
import { JobQueue } from "@/jobs/job.queue";
import { JobService } from "@/jobs/job.service";
import { ScraperProcess } from "@/jobs/scraper.process";
import { BusinessService, CollectionService, ExportService } from "@/services";
import { JobStatus } from "@/types/job";

const jobRepository = new JobRepository();
const businessService = new BusinessService();
const collectionService = new CollectionService();
const exportService = new ExportService();
const jobQueue = new JobQueue(jobRepository);

const scraperProcess = new ScraperProcess(jobRepository, async (jobId, code) => {
  if (code !== 0) {
    const job = await jobRepository.findById(jobId);
    if (job?.status === JobStatus.RUNNING) {
      await jobRepository.updateStatus(jobId, JobStatus.FAILED, {
        errorMessage:
          code === null
            ? "Worker was terminated unexpectedly"
            : `Worker exited with code ${code}`,
        completedAt: new Date(),
      });
    }
  }

  await jobQueue.processQueue();
});

jobQueue.setScraperProcess(scraperProcess);

const jobService = new JobService(
  jobRepository,
  businessService,
  collectionService,
  exportService,
  jobQueue
);

export const container = {
  jobRepository,
  businessService,
  collectionService,
  exportService,
  scraperProcess,
  jobQueue,
  jobService,
};

export type Container = typeof container;
