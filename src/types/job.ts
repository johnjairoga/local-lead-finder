export enum JobStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export type ScraperProviderName = "google-maps" | "yelp" | "facebook" | "yellow-pages";

export interface SearchParams {
  searchTerm: string;
  location: string;
  maxResults: number;
  provider?: ScraperProviderName;
}

export interface JobProgress {
  status: JobStatus;
  currentBusiness: string | null;
  processed: number;
  total: number;
  qualified: number;
  progress: number;
}

export interface JobRecord extends SearchParams {
  id: string;
  status: JobStatus;
  provider: ScraperProviderName;
  collectionId: string | null;
  processedCount: number;
  totalCount: number;
  qualifiedCount: number;
  businessesFound: number;
  newBusinessesAdded: number;
  businessesUpdated: number;
  executionTimeMs: number | null;
  progress: number;
  currentBusiness: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface CreateJobInput extends SearchParams {
  provider?: ScraperProviderName;
  collectionId?: string;
}

export interface DiscoverySummary {
  businessesFound: number;
  newBusinessesAdded: number;
  businessesUpdated: number;
  executionTimeMs: number | null;
}
