import { expect, test } from "@playwright/test";

const primaryRoutes = [
  { link: "Каталог", path: "/catalog", heading: "Каталог проектов" },
  { link: "О компании", path: "/about", heading: "Офис продаж 76" },
  { link: "Контакты", path: "/contacts", heading: "Контакты" },
] as const;

test.describe("primary navigation", () => {
  for (const route of primaryRoutes) {
    test(`opens ${route.path} from the desktop navigation`, async ({ page }) => {
      await page.goto("/");
      await page.getByRole("navigation", { name: "Основная навигация" })
        .getByRole("link", { name: route.link })
        .click();

      await expect(page).toHaveURL(route.path);
      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
    });
  }

  test("brand returns home and footer legal links open complete documents", async ({ page }) => {
    await page.goto("/contacts");
    await page.getByRole("link", { name: "Офис продаж 76 — главная" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { level: 1, name: "Весь город. Один правильный выбор." })).toBeVisible();

    const footer = page.getByRole("contentinfo");
    await footer.getByRole("link", { name: "Конфиденциальность" }).click();
    await expect(page).toHaveURL("/privacy");
    const privacyTitle = "Политика в отношении обработки персональных данных";
    await expect(page.getByRole("heading", { level: 1, name: privacyTitle })).toBeVisible();
    await expect(page.getByRole("region", { name: privacyTitle })).toContainText(/Настоящая Политика конфиденциальности/);

    await page.getByRole("contentinfo").getByRole("link", { name: "Согласие" }).click();
    await expect(page).toHaveURL("/consent");
    await expect(page.getByRole("heading", { level: 1, name: "Согласие на обработку персональных данных" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Согласие на обработку персональных данных" })).not.toBeEmpty();
  });

  test("mobile bottom navigation opens every internal destination", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/about");
    const bottomNavigation = page.getByRole("navigation", { name: "Нижняя навигация" });

    await bottomNavigation.getByRole("link", { name: "Каталог" }).click();
    await expect(page).toHaveURL("/catalog");
    await expect(page.getByRole("heading", { level: 1, name: "Каталог проектов" })).toBeVisible();

    await bottomNavigation.getByRole("link", { name: "Избранное" }).click();
    await expect(page).toHaveURL("/favorites");
    await expect(page.getByRole("heading", { level: 1, name: "Избранное" })).toBeVisible();

    await bottomNavigation.getByRole("link", { name: "Главная" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { level: 1, name: "Весь город. Один правильный выбор." })).toBeVisible();
    await expect(bottomNavigation.getByRole("link", { name: "Связаться" })).toHaveAttribute("href", "tel:+79109773737");
  });
});

test("gallery supports keyboard navigation, focus restoration and Escape", async ({ page }) => {
  await page.goto("/catalog/zhk-novatsiya");
  const trigger = page.getByRole("button", { name: "Открыть фотографию 1 из 4" });

  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Фотографии ЖК Новация" });
  await expect(dialog.getByRole("img", { name: "ЖК Новация, фотография 1 из 4" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("img", { name: "ЖК Новация, фотография 2 из 4" })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.getByRole("img", { name: "ЖК Новация, фотография 1 из 4" })).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("new routes start at the top while Back restores the prior scroll position", async ({ page }) => {
  await page.goto("/catalog");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const catalogScroll = await page.evaluate(() => window.scrollY);
  expect(catalogScroll).toBeGreaterThan(300);

  await page.getByRole("article").first().getByRole("link", { name: /^Подробнее о проекте / }).click();
  await expect(page).toHaveURL(/\/catalog\/3-shoseynaya-20$/);
  await expect(page.getByRole("heading", { level: 1, name: "3 Шоссейная 22А(Б)" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);

  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "Каталог проектов" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
});

test("declares available favicon and route-aware LCP image preloads", async ({ page, request }) => {
  const favicon = await request.get("/favicon.svg");
  expect(favicon.ok()).toBe(true);
  expect(favicon.headers()["content-type"]).toContain("image/svg+xml");

  await page.goto("/");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/favicon.svg");
  await expect(page.locator('link[rel="modulepreload"][href*="/assets/HomePage-"]')).toHaveCount(1);
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveAttribute(
    "imagesrcset",
    /hero-g-plus-480\.avif 480w, \/media\/site\/hero-g-plus-960\.avif 960w/,
  );

  await page.goto("/catalog");
  await expect(page.locator('link[rel="modulepreload"][href*="/assets/CatalogPage-"]')).toHaveCount(1);
  const catalogWarmupTiming = await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const entry = resources.find(({ name }) => /\/assets\/index-[^/]+\.js$/.test(name));
    const route = resources.find(({ name }) => /\/assets\/CatalogPage-[^/]+\.js$/.test(name));
    return { entryResponseEnd: entry?.responseEnd ?? -1, routeStart: route?.startTime ?? -1 };
  });
  expect(catalogWarmupTiming.routeStart).toBeGreaterThanOrEqual(0);
  expect(catalogWarmupTiming.entryResponseEnd).toBeGreaterThanOrEqual(0);
  // The preload is initiated with the entry graph. On a warm local server the
  // entry can finish a few milliseconds first, so allow one scheduling frame.
  expect(catalogWarmupTiming.routeStart).toBeLessThanOrEqual(catalogWarmupTiming.entryResponseEnd + 50);
  const requestedExternalEntryCss = await page.evaluate(() => (
    (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
      .some(({ name }) => /\/assets\/index-[^/]+\.css$/.test(name))
  ));
  expect(requestedExternalEntryCss).toBe(false);
  const catalogPreload = page.locator('link[rel="preload"][as="image"]');
  await expect(catalogPreload).toHaveAttribute(
    "href",
    "/media/projects/3-shoseynaya-20/cover-960.avif",
  );
  await expect(catalogPreload).toHaveAttribute(
    "imagesrcset",
    /3-shoseynaya-20\/cover-480\.avif 480w, \/media\/projects\/3-shoseynaya-20\/cover-960\.avif 960w/,
  );

  await page.goto("/catalog/zhk-novatsiya");
  await expect(page.locator('link[rel="modulepreload"][href*="/assets/ProjectPage-"]')).toHaveCount(1);
  const projectPreload = page.locator('link[rel="preload"][as="image"]');
  await expect(projectPreload).toHaveAttribute(
    "href",
    "/media/projects/zhk-novatsiya/cover-960.avif",
  );
  await expect(projectPreload).toHaveAttribute(
    "imagesrcset",
    /zhk-novatsiya\/cover-480\.avif 480w, \/media\/projects\/zhk-novatsiya\/cover-960\.avif 960w/,
  );

  await page.setViewportSize({ width: 412, height: 823 });
  const mobileLcpCases = [
    { route: "/", imageName: "Современная архитектура Ярославля", base: "/media/site/hero-g-plus" },
    { route: "/catalog", imageName: "Фасад проекта 3 Шоссейная 22А(Б)", base: "/media/projects/3-shoseynaya-20/cover" },
    { route: "/catalog/zhk-novatsiya", imageName: "Фасад проекта ЖК Новация", base: "/media/projects/zhk-novatsiya/cover" },
  ] as const;
  for (const { route, imageName, base } of mobileLcpCases) {
    const lcpRequests: string[] = [];
    const recordLcpRequest = (request: { url(): string }) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname === `${base}-480.avif` || pathname === `${base}-960.avif`) lcpRequests.push(pathname);
    };
    page.on("request", recordLcpRequest);
    await page.goto(route);
    await expect(page.locator('link[rel="preload"][as="image"]')).toHaveAttribute("href", `${base}-480.avif`);
    const currentSource = await page.getByRole("img", { name: imageName }).evaluate((image) => (
      new URL((image as HTMLImageElement).currentSrc).pathname
    ));
    expect(currentSource).toBe(`${base}-480.avif`);
    const resourceTimings = await page.evaluate((source) => (
      (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
        .filter(({ name }) => new URL(name).pathname === source)
        .map(({ encodedBodySize, transferSize }) => ({ encodedBodySize, transferSize }))
    ), `${base}-480.avif`);
    page.off("request", recordLcpRequest);
    expect(lcpRequests).toContain(`${base}-480.avif`);
    expect(lcpRequests).not.toContain(`${base}-960.avif`);
    expect(resourceTimings.length).toBeGreaterThan(0);
    // Chromium can emit a second 300-byte cache-validation entry. Only an entry
    // with an encoded body represents an image payload transferred for this page.
    expect(resourceTimings.filter(({ encodedBodySize }) => encodedBodySize > 0).length).toBeLessThanOrEqual(1);
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/catalog/zhk-novatsiya");
  const desktopCurrentSource = await page.getByRole("img", { name: "Фасад проекта ЖК Новация" })
    .evaluate((image) => new URL((image as HTMLImageElement).currentSrc).pathname);
  expect(desktopCurrentSource).toMatch(/\/cover-(?:960|1440)\.avif$/);
});

test("preloads an existing LCP variant with the correct image MIME type", async ({ page, request }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/catalog/zhk-granat");

  const href = await page.locator('link[rel="preload"][as="image"]').getAttribute("href");
  expect(href).toBe("/media/projects/zhk-granat/cover-480.avif");
  const imageResponse = await request.get(href!);
  expect(imageResponse.ok()).toBe(true);
  expect(imageResponse.headers()["content-type"]).toContain("image/avif");
  expect(await page.getByRole("img", { name: "Фасад проекта ЖК ГРАНАТ" }).evaluate((image) => (
    new URL((image as HTMLImageElement).currentSrc).pathname
  ))).toBe(href);
});
