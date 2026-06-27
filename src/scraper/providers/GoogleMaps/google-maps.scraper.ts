import { closeSession, createSession, launchBrowser } from "@/scraper/core/browser";
import { logger } from "@/lib/logger";
import type { Scraper } from "../base.scraper";
import type { ScrapedBusiness, ScrapeCallbacks, ScrapeRequest } from "../../types";
import { openAndExtractBusiness } from "./business";
import { acceptCookiesIfPresent, performSearch } from "./search";
import { scrollAndCollectListings } from "./scroll";

/**
 * Layer 1 — Data Collection only.
 * Extracts raw business data from Google Maps. No filtering or business rules.
 */
export class GoogleMapsScraper implements Scraper {
  readonly name = "google-maps";

  async scrape(
    request: ScrapeRequest,
    callbacks?: ScrapeCallbacks
  ): Promise<ScrapedBusiness[]> {
    const { searchTerm, location, maxResults } = request;
    const extracted: ScrapedBusiness[] = [];

    const browser = await launchBrowser();
    const session = await createSession(browser);

    try {
      const { page } = session;

      await performSearch(page, searchTerm, location);
      await acceptCookiesIfPresent(page);

      const listings = await scrollAndCollectListings(page, maxResults);
      const total = listings.length;

      logger.info("Starting raw business extraction", {
        module: "GoogleMapsScraper",
        total,
        maxResults,
      });

      for (let index = 0; index < listings.length; index++) {
        const listing = listings[index];

        try {
          const business = await openAndExtractBusiness(page, listing);
          extracted.push(business);

          if (callbacks?.onBusinessExtracted) {
            await callbacks.onBusinessExtracted(business);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.warn("Failed to extract business", {
            module: "GoogleMapsScraper",
            name: listing.name,
            error: message,
          });
        }

        if (callbacks?.onProgress) {
          await callbacks.onProgress({
            currentBusiness: listing.name,
            processedCount: index + 1,
            totalCount: total,
          });
        }
      }

      return extracted;
    } finally {
      await closeSession(session);
    }
  }
}
