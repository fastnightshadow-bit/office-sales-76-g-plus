import { describe, expect, it } from "vitest";
import { formatMoney, normalizeMoney, normalizeProject } from "./normalize-project";

describe("normalizeMoney", () => {
  it.each([
    ["6.9 мл", 6_900_000],
    ["6.900 млн ₽", 6_900_000],
    ["5 698 000", 5_698_000],
    ["5.698.000", 5_698_000],
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

it("preserves layouts whose source uses a hyphenated compact room label", () => {
  const project = normalizeProject({
    slug: "primer",
    title: "ЖК Пример",
    sourceUrl: "https://example.test/catalog/primer/",
    sourceCheckedAt: "2026-08-29",
    layouts: [{ id: "flat-2k", roomLabel: "2-к квартира", areaLabel: "56,4 м²" }],
  });

  expect(project.layouts).toEqual([{
    id: "flat-2k",
    room: "2",
    roomLabel: "2-к квартира",
    area: 56.4,
    notes: [],
  }]);
});

it.each([
  ["1 + евро", "1"],
  ["2 + евродвушка", "2"],
  ["3+евро", "3"],
  ["4 евро+", "4+"],
  ["Торгово-офисное", "commercial"],
  ["нежилое", "commercial"],
] as const)("preserves the exact source room label %s as %s", (roomLabel, room) => {
  const project = normalizeProject({
    slug: "primer",
    title: "ЖК Пример",
    sourceUrl: "https://example.test/catalog/primer/",
    sourceCheckedAt: "2026-08-29",
    layouts: [{ id: "layout", roomLabel }],
  });

  expect(project.layouts).toEqual([{ id: "layout", room, roomLabel, notes: [] }]);
});

it("formats total price without a square-metre suffix", () => {
  expect(formatMoney(6_900_000)).toBe("6,9 млн ₽");
});
