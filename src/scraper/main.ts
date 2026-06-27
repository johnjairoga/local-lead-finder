import { createJobRunner } from "@/jobs/job.runner";
import { logger } from "@/lib/logger";

async function main(): Promise<void> {
  const jobId = process.argv[2];

  if (!jobId) {
    console.error("Usage: tsx src/scraper/main.ts <jobId>");
    process.exit(1);
  }

  logger.info("Scraper worker started", { jobId });

  const runner = createJobRunner();

  try {
    await runner.run(jobId);
    logger.info("Scraper worker finished", { jobId });
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Scraper worker crashed", { jobId, error: message });
    process.exit(1);
  }
}

main();
