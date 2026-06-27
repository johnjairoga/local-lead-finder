import type { ScrapedBusiness } from "@/scraper/types";

function normalizeKey(business: ScrapedBusiness): string {
  const name = business.name.toLowerCase().trim();
  const address = (business.address ?? "").toLowerCase().trim();
  const phone = (business.phone ?? "").replace(/\D/g, "");
  return `${name}|${address}|${phone}`;
}

export function deduplicateBusinesses(businesses: ScrapedBusiness[]): {
  unique: ScrapedBusiness[];
  duplicatesRemoved: number;
} {
  const seen = new Set<string>();
  const unique: ScrapedBusiness[] = [];

  for (const business of businesses) {
    const key = normalizeKey(business);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(business);
  }

  return {
    unique,
    duplicatesRemoved: businesses.length - unique.length,
  };
}
