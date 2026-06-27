import type { Page } from "playwright";
import { withRetry } from "@/scraper/core/retry";
import { logger } from "@/lib/logger";

export async function performSearch(
  page: Page,
  searchTerm: string,
  location: string
): Promise<void> {
  const query = `${searchTerm} ${location}`.trim();
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

  logger.info("Navigating to Google Maps search", { module: "search", query });

  await withRetry(
    async () => {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('div[role="feed"]', { timeout: 20000 });
    },
    { label: "google-maps-search" }
  );

  await page.waitForTimeout(2000);
}

export async function acceptCookiesIfPresent(page: Page): Promise<void> {
  const acceptLabels = [
    'button:has-text("Accept all")',
    'button:has-text("Aceptar todo")',
    'button:has-text("Aceptar todas")',
  ];

  for (const selector of acceptLabels) {
    const button = page.locator(selector);
    if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
      await button.click();
      await page.waitForTimeout(1000);
      return;
    }
  }
}
