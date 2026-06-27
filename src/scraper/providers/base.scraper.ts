import type { ScrapedBusiness, ScrapeCallbacks, ScrapeRequest, ScrapeProgress } from "../types";

export interface Scraper {
  readonly name: string;
  scrape(request: ScrapeRequest, callbacks?: ScrapeCallbacks): Promise<ScrapedBusiness[]>;
}

export type { ScrapedBusiness, ScrapeRequest, ScrapeCallbacks, ScrapeProgress };