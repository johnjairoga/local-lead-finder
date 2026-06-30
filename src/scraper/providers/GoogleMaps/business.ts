import type { Page } from "playwright";
import { withRetry } from "@/scraper/core/retry";
import { logger } from "@/lib/logger";
import type { ScrapedBusiness } from "@/scraper/types";
import { extractFromAboutTab, logExtractedAttributes } from "./attributes";
import { cleanContactText, cleanPhone, parseReviewCount } from "./parse";
import type { ListingPreview } from "./scroll";

async function getTextContent(page: Page, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await locator.textContent();
      if (text?.trim()) return text.trim();
    }
  }
  return null;
}

async function getAriaLabel(page: Page, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible({ timeout: 2000 }).catch(() => false)) {
      const label = await locator.getAttribute("aria-label");
      if (label?.trim()) return label.trim();
    }
  }
  return null;
}

async function getHref(page: Page, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible({ timeout: 2000 }).catch(() => false)) {
      const href = await locator.getAttribute("href");
      if (href) return href.startsWith("http") ? href : `https://www.google.com${href}`;
    }
  }
  return null;
}

async function extractReviewCount(page: Page, listing: ListingPreview): Promise<number> {
  // Scope to [role="main"] — the Google Maps detail panel.
  // Same scope used successfully by the attribute extractor.
  const panel = page.locator('[role="main"]').first();

  const reviewSelectors = [
    'button[aria-label*="review"]',
    'button[aria-label*="reseña"]',
    'button[aria-label*="resena"]',
    'button[aria-label*="opinion"]',
    'button[aria-label*="opinión"]',
    'button[aria-label*="calificación"]',
    'span[aria-label*="review"]',
    'span[aria-label*="reseña"]',
    'button[jsaction*="reviews"]',
  ];

  for (const sel of reviewSelectors) {
    const el = panel.locator(sel).first();
    if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
      const aria = await el.getAttribute("aria-label");
      const parsed = parseReviewCount(aria);
      if (parsed !== null) return parsed;

      const text = await el.textContent();
      const fromText = parseReviewCount(text);
      if (fromText !== null) return fromText;
    }
  }

  // Try the F7nice rating block within the detail panel
  const ratingBlock = panel.locator("div.F7nice").first();
  if (await ratingBlock.isVisible({ timeout: 1500 }).catch(() => false)) {
    const blockText = await ratingBlock.textContent();
    const fromBlock = parseReviewCount(blockText, { allowBareParentheses: true });
    if (fromBlock !== null) return fromBlock;
  }

  // Fall back to the value from the scroll phase — now reliable since scroll.ts
  // reads only from aria-label (no stale full-page text leakage).
  if (listing.reviews > 0) return listing.reviews;

  return 0;
}

export async function openAndExtractBusiness(
  page: Page,
  listing: ListingPreview
): Promise<ScrapedBusiness> {
  return withRetry(
    async () => {
      const feed = page.locator('div[role="feed"]');
      const card = feed.locator('div[role="article"]').nth(listing.elementIndex);

      await card.click();
      await page.waitForTimeout(2000);

      const name =
        (await getTextContent(page, ["h1.DUwDvf", "h1"])) ?? listing.name;

      const ratingText = await getTextContent(page, [
        'div.F7nice span[aria-hidden="true"]',
        'span[aria-label*="stars"]',
        'span[aria-label*="estrellas"]',
      ]);
      const rating = ratingText ? parseFloat(ratingText) : listing.rating;

      const reviews = await extractReviewCount(page, listing);

      const phoneRaw =
        (await getAriaLabel(page, [
          'button[data-item-id^="phone:tel"]',
          'button[aria-label*="Phone"]',
          'button[aria-label*="Teléfono"]',
          'button[aria-label*="Telefono"]',
        ])) ??
        (await getTextContent(page, [
          'button[data-item-id^="phone:tel"]',
          'button[aria-label*="Phone"]',
          'button[aria-label*="Teléfono"]',
          'button[aria-label*="Telefono"]',
        ]));

      const website = await getHref(page, [
        'a[data-item-id="authority"]',
        'a[aria-label*="Website"]',
        'a[aria-label*="Sitio web"]',
      ]);

      const addressRaw =
        (await getAriaLabel(page, [
          'button[data-item-id="address"]',
          'button[aria-label*="Address"]',
          'button[aria-label*="Dirección"]',
          'button[aria-label*="Direccion"]',
        ])) ??
        (await getTextContent(page, [
          'button[data-item-id="address"]',
          'button[aria-label*="Address"]',
          'button[aria-label*="Dirección"]',
          'button[aria-label*="Direccion"]',
        ]));

      const category = await getTextContent(page, [
        "button.DkEaL",
        'button[jsaction*="category"]',
      ]);

      const attributes = await extractFromAboutTab(page);
      logExtractedAttributes(name, attributes);

      const mapsUrl = page.url();

      logger.info("Extracted raw business data", {
        module: "business",
        name,
        rating,
        reviews,
      });

      return {
        name,
        rating,
        reviews,
        mapsUrl,
        phone: cleanPhone(phoneRaw),
        website,
        address: cleanContactText(addressRaw),
        category,
        attributes,
      };
    },
    { label: `extract-business-${listing.name}` }
  );
}
