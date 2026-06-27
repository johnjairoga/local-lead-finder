import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { logger } from "@/lib/logger";
import { JobRepository } from "./job.repository";

export type WorkerExitHandler = (jobId: string, code: number | null) => Promise<void>;

/**
 * Spawns the scraper worker process (decoupled from API routes).
 * Tracks exit codes and spawn errors so jobs don't stay RUNNING forever.
 */
export class ScraperProcess {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly onWorkerExit?: WorkerExitHandler
  ) {}

  spawn(jobId: string): void {
    const scriptPath = path.join(process.cwd(), "src", "scraper", "main.ts");
    const tsxPath = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");

    logger.info("Spawning scraper worker", { jobId, scriptPath });

    let child: ChildProcess;

    try {
      child = spawn(process.execPath, [tsxPath, scriptPath, jobId], {
        detached: false,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env },
        windowsHide: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void this.handleSpawnFailure(jobId, message);
      return;
    }

    child.stdout?.on("data", (chunk: Buffer) => {
      logger.debug("Worker stdout", { jobId, output: chunk.toString().trim() });
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      logger.warn("Worker stderr", { jobId, output: chunk.toString().trim() });
    });

    child.on("error", (error) => {
      void this.handleSpawnFailure(jobId, error.message);
    });

    child.on("exit", (code) => {
      logger.info("Worker exited", { jobId, code });
      void this.onWorkerExit?.(jobId, code);
    });
  }

  private async handleSpawnFailure(jobId: string, message: string): Promise<void> {
    logger.error("Failed to spawn scraper worker", { jobId, error: message });

    const job = await this.jobRepository.findById(jobId);
    if (job?.status === "RUNNING") {
      await this.jobRepository.updateStatus(jobId, "FAILED", {
        errorMessage: `Failed to spawn worker: ${message}`,
        completedAt: new Date(),
      });
    }

    await this.onWorkerExit?.(jobId, 1);
  }
}
