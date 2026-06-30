import { logger } from "@/lib/logger";

let bootstrapped = false;

/**
 * Server startup hook: recover stuck jobs and start the idle dispatcher loop.
 */
export async function bootstrapJobSystem(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;

  try {
    const { container } = await import("@/lib/di/container");

    const recovered = await container.jobService.recoverStuckJobs();
    if (recovered > 0) {
      logger.warn("Stuck jobs recovered on startup", { recovered });
    }

    container.jobQueue.start();
    await container.jobQueue.processQueue();

    logger.info("Job system bootstrap complete");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Job system bootstrap failed — check Supabase connection (DATABASE_URL)", {
      error: message,
    });
  }
}
