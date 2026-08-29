import { describe, expect, it } from "vitest";
import {
  findUntrustedPriceRecords,
  formatMoney,
  normalizeMoney,
  normalizeProject,
} from "./normalize-project";

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

it("rejects a tiny ruble total missing a million scale when sibling totals contradict it", () => {
  const input = {
    slug: "zhk-megapolis",
    title: "ЖК Мегаполис 11",
    sourceUrl: "https://example.test/catalog/zhk-megapolis/",
    sourceCheckedAt: "2026-08-29",
    minimumPriceLabel: "от 4 ₽",
    roomPriceLabels: {
      "1": "от 4",
      "2": "от 5 000 000 ₽",
      "3": "от 6 400 000 ₽",
    },
  } as const;
  const project = normalizeProject(input);

  expect(project.minimumPrice).toBeUndefined();
  expect(project.roomPrices).toEqual([
    { room: "1" },
    { room: "2", minimumPrice: 5_000_000 },
    { room: "3", minimumPrice: 6_400_000 },
  ]);
  expect(project.dataQualityFlags).toContain("untrusted-price");
  expect(findUntrustedPriceRecords(input)).toEqual([{
    record: "project-price-block",
    reason: "unitless-sibling-scale-conflict",
    affectedFields: ["minimum-price", "room-price:1"],
    sourceLabels: ["от 4 ₽", "от 4"],
  }]);
});

it("rejects a jointly scaled layout price outlier relative to sibling layouts", () => {
  const project = normalizeProject({
    slug: "zhk-novoe-bragino-dom-2",
    title: "ЖК Новое Брагино",
    sourceUrl: "https://example.test/catalog/zhk-novoe-bragino-dom-2/",
    sourceCheckedAt: "2026-08-29",
    layouts: [
      { id: "healthy-1", roomLabel: "1-комнатная", areaLabel: "31,86", priceLabel: "3 377 226", pricePerMeterLabel: "106 002" },
      { id: "healthy-2", roomLabel: "1-комнатная", areaLabel: "34,56", priceLabel: "3 722 306", pricePerMeterLabel: "107 706" },
      { id: "healthy-3", roomLabel: "2-комнатная", areaLabel: "51,03", priceLabel: "5 451 818", pricePerMeterLabel: "106 836" },
      { id: "corrupt", roomLabel: "1-комнатная", areaLabel: "32,09", priceLabel: "347 751", pricePerMeterLabel: "10 837" },
    ],
  });

  expect(project.layouts.at(-1)).toEqual({
    id: "corrupt",
    room: "1",
    roomLabel: "1-комнатная",
    area: 32.09,
    notes: [],
  });
  expect(project.dataQualityFlags).toContain("untrusted-price");
});

it.each([
  ["Сдан", "ready"],
  ["Сдан!!!", "ready"],
  ["1 кв / 2027", "2027-Q1"],
  ["2 кв /2026", "2026-Q2"],
  ["3 кв. 2028", "2028-Q3"],
  ["4 к в 2028", "2028-Q4"],
] as const)("normalizes completion label %s for filtering and sorting", (completionLabel, completionDate) => {
  const project = normalizeProject({
    slug: "primer",
    title: "ЖК Пример",
    sourceUrl: "https://example.test/catalog/primer/",
    sourceCheckedAt: "2026-08-29",
    completionLabel,
  });

  expect(project.completionDate).toBe(completionDate);
  expect(project.dataQualityFlags).not.toContain("missing-completion");
  expect(project.dataQualityFlags).not.toContain("unparseable-completion");
});

it("flags a present completion label that cannot be normalized", () => {
  const project = normalizeProject({
    slug: "primer",
    title: "ЖК Пример",
    sourceUrl: "https://example.test/catalog/primer/",
    sourceCheckedAt: "2026-08-29",
    completionLabel: "уточняется",
  });

  expect(project.completionDate).toBeUndefined();
  expect(project.dataQualityFlags).toContain("unparseable-completion");
  expect(project.dataQualityFlags).not.toContain("missing-completion");
});

it("normalizes only the known 24\\7 editorial typo", () => {
  const project = normalizeProject({
    slug: "primer",
    title: "ЖК Пример",
    sourceUrl: "https://example.test/catalog/primer/",
    sourceCheckedAt: "2026-08-29",
    shortDescription: "Консультации 24\\7",
    description: ["Просмотры 24\\7 в будни"],
    address: "ул. Победы, д. 38\\27",
    layouts: [{ id: "flat", roomLabel: "Студия", notes: ["Поддержка 24\\7"] }],
  });

  expect(project.shortDescription).toBe("Консультации 24/7");
  expect(project.description).toEqual(["Просмотры 24/7 в будни"]);
  expect(project.address).toBe("ул. Победы, д. 38\\27");
  expect(project.layouts[0]?.notes).toEqual(["Поддержка 24/7"]);
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
