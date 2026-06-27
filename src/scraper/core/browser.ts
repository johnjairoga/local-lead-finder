import { chromium, type Browser } from "playwright";
import { logger } from "@/lib/logger";
import type { BrowserSession } from "../types";

const DOCKER_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
];

export async function launchBrowser(): Promise<Browser> {
  logger.info("Launching Playwright browser", { module: "browser" });

  return chromium.launch({
    headless: true,
    args: process.env.DOCKER === "true" ? DOCKER_ARGS : [],
  });
}

export async function createSession(browser: Browser): Promise<BrowserSession> {
  const context = await browser.newContext({
    locale: "es-US",
    viewport: { width: 1280, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    extraHTTPHeaders: {
      "Accept-Language": "es-US,es;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(45000);

  return { browser, context, page };
}

export async function closeSession(session: BrowserSession): Promise<void> {
  await session.context.close();
  await session.browser.close();
}
