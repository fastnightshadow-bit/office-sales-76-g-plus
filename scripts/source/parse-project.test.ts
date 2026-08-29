import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseProjectPage } from "./parse-project";

const SOURCE_URL = "https://офиспродаж76.рф/catalog/zhk-novatsiya/";
const projectHtml = readFileSync(
  resolve(process.cwd(), "src/test/fixtures/source-project.html"),
  "utf8",
);

describe("parseProjectPage", () => {
  it("extracts project identity, visible fields, documents, and media", () => {
    const input = parseProjectPage(projectHtml, SOURCE_URL, "2026-08-29");

    expect(input).toMatchObject({
      slug: "zhk-novatsiya",
      title: "ЖК «Новация»",
      shortDescription: "Семейный квартал рядом с Волгой",
      completionLabel: "IV квартал 2027",
      address: "Ярославль, Тверицкая наб., 1",
      district: "Заволжский",
      developer: "ГК «Пример»",
      sourceUrl: SOURCE_URL,
      sourceCheckedAt: "2026-08-29",
      roomPriceLabels: {
        studio: "от 5 400 000 ₽",
        "1": "от 6 100 000 ₽",
        "2": "от 8 200 000 ₽",
      },
      galleryUrls: [
        "https://офиспродаж76.рф/media/gallery/novatsiya-cover.jpg",
        "https://офиспродаж76.рф/media/gallery/novatsiya-yard.jpg",
      ],
    });
    expect(input.description).toEqual([
      "Закрытые дворы и благоустроенная набережная.",
      "Школа и детский сад внутри квартала.",
    ]);
    expect(input.documents).toEqual([
      {
        title: "Проектная декларация",
        url: "https://офиспродаж76.рф/media/documents/declaration.pdf",
        status: "unverified",
      },
      {
        title: "Разрешение на строительство",
        url: "https://docs.example.test/permit.pdf",
        status: "unverified",
      },
    ]);
  });

  it("separates total prices from price per metre", () => {
    const input = parseProjectPage(projectHtml, SOURCE_URL, "2026-08-29");
    expect(input.minimumPriceLabel).toBe("от 5.4 мл");
    expect(input.layouts?.[0]?.priceLabel).toBe("5 698 000");
    expect(input.layouts?.[0]?.pricePerMeterLabel).toBe("110 000");
  });

  it("preserves an incomplete layout price instead of deriving it", () => {
    const input = parseProjectPage(projectHtml, SOURCE_URL, "2026-08-29");
    expect(input.layouts?.[1]).toMatchObject({
      roomLabel: "2-комнатная квартира",
      areaLabel: "72,4 м²",
      priceLabel: "от",
      pricePerMeterLabel: "125 000",
    });
  });
});
