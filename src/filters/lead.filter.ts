import {
  MAX_REVIEWS,
  MIN_RATING,
} from "@/lib/constants";
import { logger } from "@/lib/logger";
import { deduplicateBusinesses } from "./deduplicator";
import type { FilterCriteria, FilterResult } from "./types";
import type { ScrapedBusiness } from "@/scraper/types";

const DEFAULT_CRITERIA: Required<
  Pick<FilterCriteria, "minRating" | "maxReviews" | "requiredAttributes">
> = {
  minRating: MIN_RATING,
  maxReviews: MAX_REVIEWS,
  requiredAttributes: [], // no attribute filter by default
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
    // rating === 0 means "no reviews yet" — a new/unrated business.
    // We always let those through so emerging Latino businesses are included.
    const passesRating = business.rating === 0 || business.rating >= this.minRating;
    // reviews === 0 means "unknown count" or genuinely new business.
    // Don't reject unknowns — let them through so we don't lose valid leads.
    const passesReviews = business.reviews === 0 || business.reviews <= this.maxReviews;
    return passesRating && passesReviews;
  }

  rejectReason(business: ScrapedBusiness): string | null {
    if (business.rating > 0 && business.rating < this.minRating)
      return `rating ${business.rating} < min ${this.minRating}`;
    if (business.reviews > 0 && business.reviews > this.maxReviews)
      return `reviews ${business.reviews} > max ${this.maxReviews}`;
    if (!this.hasRequiredAttribute(business))
      return `missing required attribute (${this.requiredAttributes.join(", ")})`;
    if (!this.matchesKeywords(business))
      return `keywords not matched`;
    if (!this.matchesCategory(business))
      return `category not matched`;
    return null;
  }

  /**
   * Core qualification gate: the business must self-identify as Latino/Hispanic-owned.
   * If `requiredAttributes` is empty the check is skipped (no restriction).
   * Matching is case-insensitive substring so partial labels still qualify.
   */
  hasRequiredAttribute(business: ScrapedBusiness): boolean {
    if (this.requiredAttributes.length === 0) return true;

    // Build a single searchable string from all extracted attribute labels.
    const haystack = business.attributes
      .map((attr) => attr.label.toLowerCase().trim())
      .join(" | ");

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
      const reason = this.rejectReason(business);
      if (reason === null) {
        qualified.push(business);
      } else {
        logger.debug("Business rejected by filter", {
          module: "filter",
          name: business.name,
          rating: business.rating,
          reviews: business.reviews,
          reason,
        });
        rejected.push(business);
      }
    }

    return { qualified, rejected, duplicatesRemoved };
  }
}
