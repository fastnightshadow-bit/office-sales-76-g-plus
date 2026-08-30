import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/catalog",
  "/catalog/zhk-novatsiya",
  "/catalog/zhk-yaroslavl-siti-1-ztap",
  "/catalog/zhk-granat",
  "/about",
  "/contacts",
  "/privacy",
  "/consent",
] as const;

for (const route of routes) {
  test(`${route} has healthy runtime, images, and layout`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const failures: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") failures.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
    page.on("requestfailed", (request) => failures.push(
      `requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? "unknown"}`,
    ));
    page.on("response", (response) => {
      if (response.status() >= 400) failures.push(`response: ${response.status()} ${response.url()}`);
    });

    await page.goto(route);
    await page.waitForLoadState("networkidle");

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions, `horizontal overflow on ${route}`).toEqual({ clientWidth: 1280, scrollWidth: 1280 });

    const brokenVisibleImages = await page.locator("img").evaluateAll((images) => images
      .filter((image) => {
        const rect = image.getBoundingClientRect();
        const style = getComputedStyle(image);
        return rect.width > 0 && rect.height > 0
          && rect.bottom > 0 && rect.top < innerHeight
          && style.display !== "none" && style.visibility !== "hidden";
      })
      .filter((image) => !(image as HTMLImageElement).complete || (image as HTMLImageElement).naturalWidth === 0)
      .map((image) => ({
        alt: image.getAttribute("alt"),
        src: (image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src,
      })));
    expect(brokenVisibleImages, `broken visible images on ${route}`).toEqual([]);
    expect(failures, `runtime/network failures on ${route}`).toEqual([]);
  });
}
