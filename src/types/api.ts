import type { JobProgress, JobRecord, SearchParams } from "./job";
import type { Business } from "./business";
import type { DiscoverySummary } from "./job";

export interface CreateSearchRequest {
  searchTerm: string;
  location: string;
  maxResults: number;
  provider?: string;
  collectionName?: string;
}

export interface CreateSearchResponse {
  jobId: string;
  collectionId: string;
}

export interface JobResponse {
  job: JobRecord;
  progress: JobProgress;
  discovery: DiscoverySummary;
  businesses: Business[];
}

export interface DashboardSummary {
  totalLeads: number;
  collectionsCount: number;
  newLeads: number;
  lastDiscoveryAt: Date | null;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
}

export type { SearchParams, JobRecord, JobProgress, Business };
