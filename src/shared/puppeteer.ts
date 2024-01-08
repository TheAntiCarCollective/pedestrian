import type { Page } from "puppeteer";

import puppeteer from "puppeteer";

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
