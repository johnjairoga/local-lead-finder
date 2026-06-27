import { SCRAPER_RETRY_ATTEMPTS, SCRAPER_RETRY_DELAY_MS } from "@/lib/constants";
import { logger } from "@/lib/logger";

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    attempts?: number;
    delayMs?: number;
    label?: string;
  }
): Promise<T> {
  const attempts = options?.attempts ?? SCRAPER_RETRY_ATTEMPTS;
  const delayMs = options?.delayMs ?? SCRAPER_RETRY_DELAY_MS;
  const label = options?.label ?? "operation";

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);

      if (attempt < attempts) {
        logger.warn(`Retrying ${label}`, {
          module: "retry",
          attempt,
          attempts,
          error: message,
        });
        await sleep(delayMs * attempt);
      }
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
