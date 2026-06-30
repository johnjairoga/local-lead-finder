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
  const reviewSelectors = [
    'button[aria-label*="review"]',
    'button[aria-label*="reseña"]',
    'button[aria-label*="resena"]',
    'button[aria-label*="opinion"]',
    'button[aria-label*="opinión"]',
    'button[aria-label*="calificación"]',
    'span[aria-label*="review"]',
    'span[aria-label*="reseña"]',
    'span[aria-label*="resena"]',
    'span[aria-label*="opinion"]',
    'button[jsaction*="reviews"]',
  ];

  for (const selector of reviewSelectors) {
    const aria = await getAriaLabel(page, [selector]);
    const parsed = parseReviewCount(aria);
    if (parsed !== null) return parsed;

    const text = await getTextContent(page, [selector]);
    const fromText = parseReviewCount(text);
    if (fromText !== null) return fromText;
  }

  const ratingBlock = page.locator("div.F7nice").first();
  if (await ratingBlock.isVisible({ timeout: 1500 }).catch(() => false)) {
    const blockText = await ratingBlock.textContent();
    const fromBlock = parseReviewCount(blockText, { allowBareParentheses: true });
    if (fromBlock !== null) return fromBlock;
  }

  const headerText = await page
    .locator("h1.DUwDvf, h1")
    .first()
    .locator("xpath=ancestor::div[1]")
    .textContent()
    .catch(() => null);
  const fromHeader = parseReviewCount(headerText, { allowBareParentheses: true });
  if (fromHeader !== null) return fromHeader;

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
