import { describe, expect, it } from "vitest";
import { parseCompany, parseLegalDocument } from "./parse-company";

describe("parseCompany", () => {
  it("selects the approved repeated contacts and preserves the verified legal identity", () => {
    const company = parseCompany({
      aboutHtml: `
        <main><h3>Директор компании</h3><p>Рыжков Михаил Валерьевич</p>
        <a href="tel:+79109773737">+7 (910) 977-37-37</a>
        <a href="tel:+74852955555">+7 (4852) 95-55-55</a>
        <a href="mailto:yar.vibor@mail.ru">Email</a>
        <a href="https://t.me/+79109773737">Telegram</a>
        <a href="https://max.ru/u/public-id">MAX</a></main>`,
      catalogHtml: `<button data-preview="ООО «Ваш выбор» ИНН 7602067446. г. Ярославль, ул. Победы д.38\\27 оф 501, 8(902)333-59-69"></button>`,
      checkedAt: "2026-08-29",
    });

    expect(company).toEqual({
      brand: "Офис продаж 76",
      legalName: "ООО «Ваш выбор»",
      inn: "7602067446",
      director: "Михаил Валерьевич Рыжков",
      address: "Ярославль, ул. Победы, д. 38/27, офис 501",
      cityPhone: "+7 (4852) 95-55-55",
      mobilePhone: "+7 (910) 977-37-37",
      email: "yar.vibor@mail.ru",
      telegramUrl: "https://t.me/+79109773737",
      maxUrl: "https://max.ru/u/public-id",
      sourceCheckedAt: "2026-08-29",
    });
  });
});

describe("parseLegalDocument", () => {
  it("extracts plain paragraphs and marks source legal text for review", () => {
    const legal = parseLegalDocument(
      `<main class="policy-content"><h1 class="policy-title">Политика</h1>
        <div class="policy-text">Первый абзац.<br><br>Второй абзац.</div></main>`,
      "privacy",
      "https://офиспродаж76.рф/policy/",
      "2026-08-29",
    );

    expect(legal).toEqual({
      kind: "privacy",
      title: "Политика",
      paragraphs: ["Первый абзац.", "Второй абзац."],
      sourceUrl: "https://офиспродаж76.рф/policy/",
      sourceCheckedAt: "2026-08-29",
      requiresLegalReview: true,
    });
  });
});
