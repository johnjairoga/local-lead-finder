import type { ScrapedBusiness } from "@/scraper/types";

export interface FilterCriteria {
  minRating?: number;
  maxReviews?: number;
  requiredAttributes?: string[];
  keywords?: string[];
  categories?: string[];
}

export interface FilterResult {
  qualified: ScrapedBusiness[];
  rejected: ScrapedBusiness[];
  duplicatesRemoved: number;
}
