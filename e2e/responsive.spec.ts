import { expect, test, type Page } from "@playwright/test";

const widths = [360, 390, 430, 768, 1024, 1280, 1440] as const;

async function expectNoHorizontalOverflow(page: Page, width: number) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions, `horizontal overflow at ${width}px`).toEqual({ clientWidth: width, scrollWidth: width });
}

for (const width of widths) {
  test(`home shell and search follow the ${width}px breakpoint contract`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expectNoHorizontalOverflow(page, width);

    const bottomNav = page.getByRole("navigation", { name: "Нижняя навигация" });
    const desktopNav = page.getByRole("navigation", { name: "Основная навигация" });
    if (width < 1024) {
      await expect(bottomNav).toBeVisible();
      await expect(desktopNav).toBeHidden();
    } else {
      await expect(bottomNav).toBeHidden();
      await expect(desktopNav).toBeVisible();
    }

    const compactSearch = page.getByRole("button", { name: "Комнаты · Цена · Район" });
    const fullSearch = page.getByRole("form", { name: "Поиск новостроек" });
    if (width < 768) {
      await expect(compactSearch).toBeVisible();
      await expect(fullSearch).toHaveCount(0);
    } else {
      await expect(fullSearch).toBeVisible();
      await expect(compactSearch).toHaveCount(0);
    }

    if (width < 1024) {
      const controls = [
        page.getByRole("button", { name: "Открыть меню" }),
        ...await bottomNav.getByRole("link").all(),
        ...(width < 768 ? [compactSearch] : []),
      ];
      for (const control of controls) {
        const box = await control.boundingBox();
        expect(box, `visible primary control missing at ${width}px`).not.toBeNull();
        expect(box!.height, `primary control is shorter than 44px at ${width}px`).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test(`project CTA clears content and page does not overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/catalog/zhk-novatsiya");
    await expectNoHorizontalOverflow(page, width);

    const mobileCta = page.getByRole("button", { name: "Записаться на показ — фиксированная кнопка" });
    if (width < 1024) {
      await expect(mobileCta).toBeVisible();
      const box = await mobileCta.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const contentBox = await page.locator("aside").filter({ hasText: "Данные сохранены из источника проекта" }).boundingBox();
      const ctaBox = await mobileCta.boundingBox();
      expect(contentBox).not.toBeNull();
      expect(ctaBox).not.toBeNull();
      expect(contentBox!.y + contentBox!.height).toBeLessThanOrEqual(ctaBox!.y);
    } else {
      await expect(mobileCta).toBeHidden();
    }
  });
}
