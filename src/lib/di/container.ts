import { JobRepository } from "@/jobs/job.repository";
import { JobQueue } from "@/jobs/job.queue";
import { JobService } from "@/jobs/job.service";
import { ScraperProcess } from "@/jobs/scraper.process";
import { ExportService, LeadService } from "@/services";

const jobRepository = new JobRepository();
const leadService = new LeadService();
const exportService = new ExportService();
const jobQueue = new JobQueue(jobRepository);

const scraperProcess = new ScraperProcess(jobRepository, async (jobId, code) => {
  if (code !== 0) {
    const job = await jobRepository.findById(jobId);
    if (job?.status === "RUNNING") {
      await jobRepository.updateStatus(jobId, "FAILED", {
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

const jobService = new JobService(jobRepository, leadService, exportService, jobQueue);

export const container = {
  jobRepository,
  leadService,
  exportService,
  scraperProcess,
  jobQueue,
  jobService,
};

export type Container = typeof container;
