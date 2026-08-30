import AxeBuilder from "@axe-core/playwright";
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
  test(`${route} has no serious or critical axe violations`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blocking = results.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
}
