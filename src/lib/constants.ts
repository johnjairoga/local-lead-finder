export const MIN_RATING = 4;
export const MAX_REVIEWS = 100;

export const LATINO_OWNED_ATTRIBUTES = [
  "Identifies as Latino-owned",
  "Identifies as Latina-owned",
  "Se identifica como empresario latino",
  "empresario latino",
  "latino-owned",
  "latina-owned",
] as const;

/** Regex patterns used when scraping page text (EN + ES). */
export const LATINO_OWNED_ATTRIBUTE_PATTERNS = [
  /identifies as latino-owned/i,
  /identifies as latina-owned/i,
  /se identifica como empresario latino/i,
  /empresario latino/i,
  /empresaria latina/i,
] as const;

export const DEFAULT_PROVIDER = "google-maps" as const;
export const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 2000);
export const MAX_CONCURRENT_JOBS = Number(process.env.MAX_CONCURRENT_JOBS ?? 1);
export const RESULTS_DIR = process.env.RESULTS_DIR ?? "./results";

export const STUCK_JOB_MINUTES = Number(process.env.STUCK_JOB_MINUTES ?? 10);
export const QUEUE_POLL_INTERVAL_MS = Number(process.env.QUEUE_POLL_INTERVAL_MS ?? 5000);
export const QUEUE_LOCK_TTL_MS = Number(process.env.QUEUE_LOCK_TTL_MS ?? 10000);

export const SCRAPER_RETRY_ATTEMPTS = 3;
export const SCRAPER_RETRY_DELAY_MS = 1000;
