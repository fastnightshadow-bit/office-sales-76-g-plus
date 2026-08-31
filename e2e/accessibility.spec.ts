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

test("the open lead dialog has no serious or critical axe violations and a full consent target", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/catalog/zhk-novatsiya");
  await page.getByRole("button", { name: "Записаться на показ — фиксированная кнопка", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Записаться на показ" });
  await expect(dialog).toBeVisible();

  const consentLabel = dialog.locator('label[for="lead-consent"]');
  const consentBox = await consentLabel.boundingBox();
  expect(consentBox?.width).toBeGreaterThanOrEqual(44);
  expect(consentBox?.height).toBeGreaterThanOrEqual(44);

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
