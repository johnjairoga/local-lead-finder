import type { SearchFilters } from "@/types/collection";

export const MIN_RATING = 4;
export const MAX_REVIEWS = 300;

export const LATINO_OWNED_ATTRIBUTES = [
  // English
  "Identifies as Latino-owned",
  "Identifies as Latina-owned",
  "Identifies as Hispanic-owned",
  "latino-owned",
  "latina-owned",
  "hispanic-owned",
  // Spanish (Google Maps ES UI — male and female forms)
  "Se identifica como empresario latino",
  "Se identifica como empresaria latina",
  "Se identifica como empresario hispano",
  "Se identifica como empresaria hispana",
  "empresario latino",
  "empresaria latina",
  "empresario hispano",
  "empresaria hispana",
] as const;

/** Regex patterns used when scraping page text (EN + ES). */
export const LATINO_OWNED_ATTRIBUTE_PATTERNS = [
  /identifies as latina?-owned/i,
  /identifies as hispanic-owned/i,
  /se identifica como empresari[ao] latina?/i,
  /se identifica como empresari[ao] hispana?/i,
  /empresari[ao] latina?/i,
  /empresari[ao] hispana?/i,
  /latina?-owned/i,
  /hispanic-owned/i,
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

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  minRating: MIN_RATING,                         // ≥ 4.0 stars
  maxReviews: 99999,                             // no cap — Latino businesses of any size
  requiredAttributes: [...LATINO_OWNED_ATTRIBUTES], // must identify as Latino/Latina-owned
  provider: DEFAULT_PROVIDER,
  maxResults: 50,
};
