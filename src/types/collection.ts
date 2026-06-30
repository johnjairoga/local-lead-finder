import type { FilterCriteria } from "@/filters/types";
import type { ScraperProviderName } from "./job";

export interface SearchFilters extends FilterCriteria {
  maxResults?: number;
  provider?: ScraperProviderName;
}

export interface Collection {
  id: string;
  name: string;
  searchTerm: string;
  location: string;
  filters: SearchFilters;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCollectionInput {
  name?: string;
  searchTerm: string;
  location: string;
  filters?: SearchFilters;
}

export interface CollectionListItem extends Collection {
  businessCount: number;
  lastSearchAt: Date | null;
}

export interface CollectionDetail extends Collection {
  businessCount: number;
  searchRuns: CollectionSearchRunSummary[];
}

export interface CollectionSearchRunSummary {
  id: string;
  status: string;
  businessesFound: number;
  newBusinessesAdded: number;
  businessesUpdated: number;
  executionTimeMs: number | null;
  createdAt: Date;
  completedAt: Date | null;
}
