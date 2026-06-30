import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { RESULTS_DIR } from "@/lib/constants";
import { ExportNotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { Business } from "@/types/business";
import type { DiscoverySummary, JobRecord } from "@/types/job";

export class ExportService {
  private readonly resultsDir: string;

  constructor(resultsDir: string = RESULTS_DIR) {
    this.resultsDir = resultsDir;
  }

  private getFilePath(jobId: string): string {
    return path.join(this.resultsDir, `${jobId}.json`);
  }

  async exportSearchRun(
    job: JobRecord,
    businesses: Business[],
    discovery: DiscoverySummary
  ): Promise<string> {
    await mkdir(this.resultsDir, { recursive: true });

    const payload = {
      jobId: job.id,
      collectionId: job.collectionId,
      status: job.status,
      searchTerm: job.searchTerm,
      location: job.location,
      maxResults: job.maxResults,
      provider: job.provider,
      discovery,
      progress: {
        processed: job.processedCount,
        total: job.totalCount,
        qualified: job.qualifiedCount,
        progress: job.progress,
      },
      completedAt: job.completedAt?.toISOString() ?? null,
      businesses,
    };

    const filePath = this.getFilePath(job.id);
    await writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");

    logger.info("Search run exported", { jobId: job.id, filePath });
    return filePath;
  }

  async readExport(jobId: string): Promise<string> {
    const filePath = this.getFilePath(jobId);

    try {
      return await readFile(filePath, "utf-8");
    } catch {
      throw new ExportNotFoundError(jobId);
    }
  }
}
