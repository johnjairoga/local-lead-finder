import type { JobProgress, JobRecord, SearchParams } from "./job";
import type { Lead } from "./lead";

export interface CreateSearchRequest {
  searchTerm: string;
  location: string;
  maxResults: number;
  provider?: string;
}

export interface CreateSearchResponse {
  jobId: string;
}

export interface JobResponse {
  job: JobRecord;
  progress: JobProgress;
  leads: Lead[];
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
}

export type { SearchParams, JobRecord, JobProgress, Lead };
