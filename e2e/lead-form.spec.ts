import { expect, test } from "@playwright/test";

test("project lead dialog validates locally, keeps context, transmits nothing and clears on close", async ({ page }) => {
  await page.goto("/catalog/zhk-novatsiya");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Записаться на показ", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Записаться на показ" });
  await expect(dialog.getByText(/Объект: ЖК Новация/)).toBeVisible();

  await dialog.getByRole("button", { name: "Проверить заявку" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByLabel("Имя")).toHaveAttribute("aria-invalid", "true");

  const enteredName = "Илья Проверка Лида";
  const enteredPhone = "+7 (910) 123-45-67";
  const enteredComment = "Маркер формы LEAD-NETWORK-CHECK";
  await dialog.getByLabel("Имя").fill(enteredName);
  await dialog.getByLabel("Телефон").fill(enteredPhone);
  await dialog.getByLabel("Комментарий (необязательно)").fill(enteredComment);
  await expect(dialog.getByLabel("Телефон")).toHaveValue(enteredPhone);
  await dialog.getByRole("checkbox", { name: /Согласие/ }).check();
  await expect(dialog.getByRole("alert")).toBeHidden();

  const submitTraffic: Array<{ method: string; url: string; body: string }> = [];
  const captureSubmitTraffic = (request: { method(): string; url(): string; postData(): string | null }) => {
    submitTraffic.push({ method: request.method(), url: request.url(), body: request.postData() ?? "" });
  };
  page.on("request", captureSubmitTraffic);
  await dialog.getByRole("button", { name: "Проверить заявку" }).click();
  const successDialog = page.getByRole("dialog", { name: "Демо-форма проверена" });
  await expect(successDialog.getByRole("heading", { name: "Демо-форма проверена" })).toBeVisible();
  await expect(successDialog.getByText(/данные никуда не отправляются и не сохраняются/i)).toBeVisible();
  page.off("request", captureSubmitTraffic);
  const forbiddenTraffic = submitTraffic.filter(({ url, body }) => {
    const decode = (value: string) => {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    };
    const decoded = `${decode(url)}\n${decode(body)}`.toLocaleLowerCase("ru");
    return /\/(?:api\/)?leads?(?:[/?#]|$)/i.test(url)
      || [enteredName, enteredPhone, enteredComment].some((value) => decoded.includes(value.toLocaleLowerCase("ru")));
  });
  expect(forbiddenTraffic).toEqual([]);

  await successDialog.getByRole("button", { name: "Закрыть результат" }).click();
  await page.getByRole("button", { name: "Записаться на показ", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Записаться на показ" }).getByLabel("Имя")).toHaveValue("");
  await expect(page.getByRole("dialog", { name: "Записаться на показ" }).getByLabel("Телефон")).toHaveValue("");
  await expect(page.getByRole("dialog", { name: "Записаться на показ" }).getByLabel("Комментарий (необязательно)"))
    .toHaveValue("");
});

test("lead dialog styles do not add a form gap to the hero search", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const gap = await page.locator("form").evaluate((form) => getComputedStyle(form).gap);
  expect(gap).not.toBe("18px");
});
