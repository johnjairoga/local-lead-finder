import type { Scraper } from "./base.scraper";
import { GoogleMapsScraper } from "./GoogleMaps/google-maps.scraper";
import type { ScraperProviderName } from "@/types/job";

const registry: Record<string, () => Scraper> = {
  "google-maps": () => new GoogleMapsScraper(),
};

export function getScraper(provider: ScraperProviderName | string): Scraper {
  const factory = registry[provider];
  if (!factory) {
    throw new Error(`Unknown scraper provider: ${provider}`);
  }
  return factory();
}

export function registerScraper(provider: string, factory: () => Scraper): void {
  registry[provider] = factory;
}

export { GoogleMapsScraper };
