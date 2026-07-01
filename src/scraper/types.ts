export interface BusinessAttribute {
  label: string;
  value?: string;
}

/**
 * Raw data extracted by scrapers — no business rules applied.
 */
export interface ScrapedBusiness {
  name: string;
  rating: number;
  reviews: number;
  mapsUrl: string;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  category?: string | null;
  attributes: BusinessAttribute[];
}

export interface ScrapeRequest {
  searchTerm: string;
  location: string;
  maxResults: number;
  /** Names of businesses already processed in a prior run — skip detail extraction for these. */
  skipNames?: Set<string>;
}

export interface ScrapeProgress {
  currentBusiness: string;
  processedCount: number;
  totalCount: number;
}

export interface ScrapeCallbacks {
  onProgress?: (progress: ScrapeProgress) => Promise<void>;
  onBusinessExtracted?: (business: ScrapedBusiness) => Promise<void>;
}

export interface BrowserSession {
  browser: import("playwright").Browser;
  context: import("playwright").BrowserContext;
  page: import("playwright").Page;
}
