import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
});

test("finds a project and returns with filters intact", async ({ page }) => {
  await page.goto("/catalog?district=%D0%A6%D0%B5%D0%BD%D1%82%D1%80&rooms=2");
  await expect(page.getByRole("status", { name: "Количество найденных проектов" })).toContainText(/Найден/);
  const firstCard = page.getByRole("article").first();
  const title = await firstCard.getByRole("heading", { level: 2 }).innerText();
  await firstCard.getByRole("link", { name: title, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/district=/);
  await expect(page).toHaveURL(/rooms=2/);
  await expect(page.getByRole("button", { name: "Центр" })).toHaveAttribute("aria-pressed", "true");
});

test("favorites persist after reload and appear in the favorites route", async ({ page }) => {
  await page.goto("/catalog");
  const card = page.getByRole("article").first();
  const title = await card.getByRole("heading", { level: 2 }).innerText();
  await card.getByRole("button", { name: `Добавить ${title} в избранное`, exact: true }).click();
  await page.reload();
  await expect(page.getByRole("article").first().getByRole("button", {
    name: `Убрать ${title} из избранного`,
    exact: true,
  }))
    .toHaveAttribute("aria-pressed", "true");

  await page.goto("/favorites");
  await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
});

test("empty results reset to the complete catalog", async ({ page }) => {
  await page.goto("/catalog");
  await page.getByRole("searchbox", { name: "Поиск по каталогу" }).fill("несуществующий проект xyz");
  await expect(page.getByRole("heading", { name: "Ничего не нашли" })).toBeVisible();
  await page.getByRole("button", { name: "Сбросить фильтры" }).click();

  await expect(page).toHaveURL("/catalog");
  await expect(page.getByRole("status", { name: "Количество найденных проектов" })).toHaveText("Найдено 92 проекта");
  await expect(page.getByRole("article")).toHaveCount(18);
});

test("real catalog cards use an exact positive total-price label and approved text color", async ({ page }) => {
  await page.goto("/catalog");
  const firstCard = page.getByRole("article").first();
  await expect(firstCard.getByRole("img")).toHaveAttribute("loading", "eager");
  await expect(firstCard.getByRole("img")).toHaveAttribute("fetchpriority", "high");
  await expect(firstCard.getByText(/^от \d+(?:[,.]\d+)? млн ₽$/)).toBeVisible();
  await expect(firstCard.getByText(/млн ₽\/м²/)).toHaveCount(0);
  await expect(firstCard.getByText(/^от\s*$/)).toHaveCount(0);

  const metadataColor = await firstCard.locator("span").first().evaluate((element) => getComputedStyle(element).color);
  expect(metadataColor).toBe("rgb(28, 39, 33)");
});
