import {
  LATINO_OWNED_ATTRIBUTES,
  MAX_REVIEWS,
  MIN_RATING,
} from "@/lib/constants";
import { deduplicateBusinesses } from "./deduplicator";
import type { FilterCriteria, FilterResult } from "./types";
import type { ScrapedBusiness } from "@/scraper/types";

const DEFAULT_CRITERIA: Required<
  Pick<FilterCriteria, "minRating" | "maxReviews" | "requiredAttributes">
> = {
  minRating: MIN_RATING,
  maxReviews: MAX_REVIEWS,
  requiredAttributes: [...LATINO_OWNED_ATTRIBUTES],
};

/**
 * Layer 2 — Business Logic only.
 * No Playwright. No database. Pure filtering and validation.
 */
export class LeadFilter {
  constructor(private readonly criteria: FilterCriteria = {}) {}

  private get minRating(): number {
    return this.criteria.minRating ?? DEFAULT_CRITERIA.minRating;
  }

  private get maxReviews(): number {
    return this.criteria.maxReviews ?? DEFAULT_CRITERIA.maxReviews;
  }

  private get requiredAttributes(): string[] {
    return this.criteria.requiredAttributes ?? DEFAULT_CRITERIA.requiredAttributes;
  }

  passesRatingAndReviews(business: ScrapedBusiness): boolean {
    return business.rating >= this.minRating && business.reviews <= this.maxReviews;
  }

  hasRequiredAttribute(business: ScrapedBusiness): boolean {
    const haystack = business.attributes
      .map((attr) => attr.label.toLowerCase().trim())
      .join(" ");

    return this.requiredAttributes.some((phrase) =>
      haystack.includes(phrase.toLowerCase())
    );
  }

  matchesKeywords(business: ScrapedBusiness): boolean {
    const keywords = this.criteria.keywords;
    if (!keywords?.length) return true;

    const haystack = [
      business.name,
      business.category ?? "",
      business.address ?? "",
      ...business.attributes.map((a) => a.label),
    ]
      .join(" ")
      .toLowerCase();

    return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
  }

  matchesCategory(business: ScrapedBusiness): boolean {
    const categories = this.criteria.categories;
    if (!categories?.length) return true;
    if (!business.category) return false;

    const normalized = business.category.toLowerCase();
    return categories.some((cat) => normalized.includes(cat.toLowerCase()));
  }

  isQualified(business: ScrapedBusiness): boolean {
    return (
      this.passesRatingAndReviews(business) &&
      this.hasRequiredAttribute(business) &&
      this.matchesKeywords(business) &&
      this.matchesCategory(business)
    );
  }

  process(businesses: ScrapedBusiness[]): FilterResult {
    const { unique, duplicatesRemoved } = deduplicateBusinesses(businesses);
    const qualified: ScrapedBusiness[] = [];
    const rejected: ScrapedBusiness[] = [];

    for (const business of unique) {
      if (this.isQualified(business)) {
        qualified.push(business);
      } else {
        rejected.push(business);
      }
    }

    return { qualified, rejected, duplicatesRemoved };
  }
}
