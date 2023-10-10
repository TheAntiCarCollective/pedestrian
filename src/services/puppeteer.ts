import type { Page } from "puppeteer";

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export const usePage = async <T>(callback: (page: Page) => Promise<T>) => {
  const browser = await puppeteer.launch({ headless: "new" });

  try {
    const pages = await browser.pages();
    const page = pages[0] ?? (await browser.newPage());
    return await callback(page);
  } finally {
    await browser.close();
  }
};
