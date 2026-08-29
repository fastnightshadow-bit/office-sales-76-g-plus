import { describe, expect, it } from "vitest";
import { formatMoney, normalizeMoney, normalizeProject } from "./normalize-project";

describe("normalizeMoney", () => {
  it.each([
    ["6.9 мл", 6_900_000],
    ["5 698 000", 5_698_000],
    ["110 000 руб/м²", 110_000],
    ["от", undefined],
    ["0 млн", undefined],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeMoney(input)).toBe(expected);
  });
});

it("does not invent missing prices", () => {
  const project = normalizeProject({
    slug: "primer",
    title: "ЖК Пример",
    sourceUrl: "https://example.test/catalog/primer/",
    sourceCheckedAt: "2026-08-29",
    minimumPriceLabel: "от",
  });
  expect(project.minimumPrice).toBeUndefined();
  expect(project.dataQualityFlags).toContain("missing-price");
});

it("formats total price without a square-metre suffix", () => {
  expect(formatMoney(6_900_000)).toBe("6,9 млн ₽");
});
