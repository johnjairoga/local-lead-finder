import type { Page } from "playwright";
import { logger } from "@/lib/logger";
import { parseReviewCount } from "./parse";
export interface ListingPreview {
  name: string;
  rating: number;
  reviews: number;
  mapsUrl: string;
  elementIndex: number;
}

export async function scrollAndCollectListings(
  page: Page,
  maxResults: number
): Promise<ListingPreview[]> {
  const feed = page.locator('div[role="feed"]');
  const seen = new Set<string>();
  const listings: ListingPreview[] = [];
  let stagnantRounds = 0;

  while (listings.length < maxResults && stagnantRounds < 5) {
    const cards = feed.locator('div[role="article"]');
    const count = await cards.count();
    const beforeCount = listings.length;

    for (let i = 0; i < count && listings.length < maxResults; i++) {
      const card = cards.nth(i);

      try {
        const name = await card.locator("div.fontHeadlineSmall").first().textContent();
        if (!name?.trim()) continue;

        const key = name.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const ariaLabel = (await card.getAttribute("aria-label")) ?? "";
        const cardText = (await card.textContent()) ?? "";

        const ratingMatch = ariaLabel.match(/(\d+(?:\.\d+)?)\s+(?:stars?|estrellas?)/i)
          ?? cardText.match(/(\d+(?:\.\d+)?)\s*(?:stars?|estrellas?)/i);

        const reviewsFromAria = parseReviewCount(ariaLabel);
        const reviewsFromCard = parseReviewCount(cardText);
        const reviewsMatch = ariaLabel.match(/(\d[\d,]*)\s+(?:reviews?|reseñas?|resenas?|opiniones?)/i);

        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
        const reviews =
          reviewsFromAria ??
          reviewsFromCard ??
          (reviewsMatch ? parseInt(reviewsMatch[1].replace(/,/g, ""), 10) : 0);
        listings.push({
          name: name.trim(),
          rating,
          reviews,
          mapsUrl: page.url(),
          elementIndex: i,
        });
      } catch {
        continue;
      }
    }

    if (listings.length === beforeCount) {
      stagnantRounds++;
    } else {
      stagnantRounds = 0;
    }

    await feed.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(1500);
  }

  logger.info("Collected listings from scroll", {
    module: "scroll",
    count: listings.length,
  });

  return listings.slice(0, maxResults);
}
