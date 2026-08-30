import { expect, test } from "@playwright/test";

test("project lead dialog validates locally, keeps context, transmits nothing and clears on close", async ({ page }) => {
  const submissionRequests: string[] = [];
  page.on("request", (request) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) submissionRequests.push(request.url());
  });

  await page.goto("/catalog/zhk-novatsiya");
  await page.getByRole("button", { name: "Записаться на показ", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Записаться на показ" });
  await expect(dialog.getByText(/Объект: ЖК Новация/)).toBeVisible();

  await dialog.getByRole("button", { name: "Проверить заявку" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByLabel("Имя")).toHaveAttribute("aria-invalid", "true");

  await dialog.getByLabel("Имя").fill("Илья");
  await dialog.getByLabel("Телефон").fill("+7 (910) 000-00-00");
  await expect(dialog.getByLabel("Телефон")).toHaveValue("+7 (910) 000-00-00");
  await dialog.getByRole("checkbox", { name: /Согласие/ }).check();
  await expect(dialog.getByRole("alert")).toBeHidden();
  await dialog.getByRole("button", { name: "Проверить заявку" }).click();
  const successDialog = page.getByRole("dialog", { name: "Демо-форма проверена" });
  await expect(successDialog.getByRole("heading", { name: "Демо-форма проверена" })).toBeVisible();
  await expect(successDialog.getByText(/данные никуда не отправляются и не сохраняются/i)).toBeVisible();
  expect(submissionRequests).toEqual([]);

  await successDialog.getByRole("button", { name: "Закрыть результат" }).click();
  await page.getByRole("button", { name: "Записаться на показ", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Записаться на показ" }).getByLabel("Имя")).toHaveValue("");
  await expect(page.getByRole("dialog", { name: "Записаться на показ" }).getByLabel("Телефон")).toHaveValue("");
  await expect(page.getByRole("dialog", { name: "Записаться на показ" }).getByLabel("Комментарий (необязательно)"))
    .toHaveValue("");
});
