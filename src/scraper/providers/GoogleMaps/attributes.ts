import type { Page } from "playwright";
import { LATINO_OWNED_ATTRIBUTE_PATTERNS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import type { BusinessAttribute } from "@/scraper/types";

const ABOUT_TAB_LABELS = [
  "About",
  "Acerca de",
  "Información",
  "Overview",
  "Descripción",
];

function normalizeAttributeLabel(label: string): string {
  return label.replace(/\uE000|\uE001|[\uE000-\uF8FF]/g, "").trim();
}

function addUniqueAttribute(attributes: BusinessAttribute[], label: string): void {
  const cleaned = normalizeAttributeLabel(label);
  if (!cleaned) return;
  if (!attributes.some((attr) => attr.label.toLowerCase() === cleaned.toLowerCase())) {
    attributes.push({ label: cleaned });
  }
}

function extractLatinoPhrasesFromText(text: string, attributes: BusinessAttribute[]): void {
  for (const pattern of LATINO_OWNED_ATTRIBUTE_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[0]) {
      addUniqueAttribute(attributes, match[0]);
    }
  }
}

async function clickAboutTab(page: Page): Promise<boolean> {
  const tabs = page.locator('button[role="tab"]');
  const tabCount = await tabs.count();

  for (let i = 0; i < tabCount; i++) {
    const tab = tabs.nth(i);
    const text = ((await tab.textContent()) ?? "").trim();

    if (ABOUT_TAB_LABELS.some((label) => text.toLowerCase() === label.toLowerCase())) {
      await tab.click();
      await page.waitForTimeout(1500);
      return true;
    }
  }

  // Fallback: tab whose label contains "acerca" or "about"
  const fallbackTab = page.locator(
    'button[role="tab"]:has-text("Acerca"), button[role="tab"]:has-text("About"), button[role="tab"]:has-text("Información")'
  );

  if (await fallbackTab.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await fallbackTab.first().click();
    await page.waitForTimeout(1500);
    return true;
  }

  return false;
}

export async function extractAttributes(page: Page): Promise<BusinessAttribute[]> {
  const attributes: BusinessAttribute[] = [];

  const attributeSelectors = [
    'button[data-item-id^="place-attribute"]',
    '[data-item-id^="place-attribute"]',
    'div[aria-label*="Identifies as"]',
    'div[aria-label*="Se identifica"]',
    'span[aria-label*="Identifies as"]',
    'span[aria-label*="Se identifica"]',
  ];

  for (const selector of attributeSelectors) {
    const locators = page.locator(selector);
    const count = await locators.count();

    for (let i = 0; i < count; i++) {
      const element = locators.nth(i);
      const text =
        (await element.textContent()) ||
        (await element.getAttribute("aria-label")) ||
        "";
      if (text.trim()) addUniqueAttribute(attributes, text);
    }
  }

  const ownerSectionPatterns = [
    /información proporcionada por la empresa/i,
    /informacion proporcionada por la empresa/i,
    /from the owner/i,
    /about the business/i,
    /provided by the business/i,
  ];

  const regions = page.locator('div[role="region"], section');
  const regionCount = await regions.count();

  for (let i = 0; i < regionCount; i++) {
    const text = (await regions.nth(i).textContent()) ?? "";
    if (!text.trim()) continue;

    const isOwnerSection = ownerSectionPatterns.some((pattern) => pattern.test(text));
    const lines = text
      .split("\n")
      .map((line) => normalizeAttributeLabel(line))
      .filter(Boolean);

    for (const line of lines) {
      if (isOwnerSection || LATINO_OWNED_ATTRIBUTE_PATTERNS.some((p) => p.test(line))) {
        addUniqueAttribute(attributes, line);
      }
    }
  }

  const mainText = await page.locator('[role="main"]').textContent().catch(() => null);
  if (mainText) {
    extractLatinoPhrasesFromText(mainText, attributes);
  }

  return attributes;
}

export async function extractFromAboutTab(page: Page): Promise<BusinessAttribute[]> {
  const clicked = await clickAboutTab(page);
  if (!clicked) {
    logger.debug("About tab not found, scanning visible page for attributes", {
      module: "attributes",
    });
  }

  return extractAttributes(page);
}

export function logExtractedAttributes(name: string, attributes: BusinessAttribute[]): void {
  logger.info("Extracted business attributes", {
    module: "attributes",
    name,
    count: attributes.length,
    labels: attributes.map((a) => a.label).join(" | "),
  });
}
