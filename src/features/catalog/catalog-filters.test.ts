import { describe, expect, it } from "vitest";
import type { Project } from "./catalog.types";
import { filterProjects } from "./catalog-filters";

function project(overrides: Partial<Project> = {}): Project {
  return {
    slug: "project",
    title: "Проект",
    shortDescription: "Описание проекта",
    description: [],
    roomPrices: [],
    features: [],
    purchasePrograms: [],
    gallery: [],
    documents: [],
    layouts: [],
    relatedProjectSlugs: [],
    sourceUrl: "https://example.test/catalog/project/",
    sourceCheckedAt: "2026-08-29",
    dataQualityFlags: [],
    ...overrides,
  };
}

describe("filterProjects", () => {
  it("combines district, room and maximum price", () => {
    const projects = [
      project({ slug: "central-park", district: "Центр", minimumPrice: 7_500_000, roomPrices: [{ room: "2", minimumPrice: 7_500_000 }] }),
      project({ slug: "central-one", district: "Центр", minimumPrice: 7_500_000, roomPrices: [{ room: "1", minimumPrice: 7_500_000 }] }),
      project({ slug: "river-park", district: "Заволжский", minimumPrice: 7_500_000, roomPrices: [{ room: "2", minimumPrice: 7_500_000 }] }),
      project({ slug: "central-expensive", district: "Центр", minimumPrice: 9_000_000, roomPrices: [{ room: "2", minimumPrice: 9_000_000 }] }),
    ];

    expect(filterProjects(projects, {
      district: "Центр",
      rooms: ["2"],
      maximumPrice: 8_000_000,
      sort: "price-asc",
    }).map(({ slug }) => slug)).toEqual(["central-park"]);
  });

  it("excludes missing prices from a price range", () => {
    const projects = [
      project({ slug: "known-price", minimumPrice: 7_500_000 }),
      project({ slug: "missing-price" }),
    ];

    expect(filterProjects(projects, { maximumPrice: 8_000_000 })
      .map(({ slug }) => slug)).toEqual(["known-price"]);
  });

  it("matches text across title, description, district and address", () => {
    const projects = [
      project({ slug: "found", title: "Дом на Волге", district: "Центр", address: "ул. Свободы, 12" }),
      project({ slug: "other", title: "Северный квартал", district: "Заволжский", address: "ул. Победы, 8" }),
    ];

    expect(filterProjects(projects, { text: "СВОБОДЫ" }).map(({ slug }) => slug)).toEqual(["found"]);
  });

  it.each([
    ["ready", ["ready"]],
    ["2026", ["2026-Q1", "2026-Q4"]],
    ["2027", ["2027-Q2"]],
    ["2028+", ["2028-Q1", "2031-Q4"]],
  ] as const)("filters completion %s by its defined semantics", (completion, includedDates) => {
    const projects = [
      ...includedDates.map((completionDate, index) => project({ slug: `included-${index}`, completionDate })),
      project({ slug: "missing" }),
      project({ slug: "unparseable", completionDate: "2028" }),
      ...(completion === "ready" ? [project({ slug: "scheduled", completionDate: "2026-Q1" })] : []),
    ];

    expect(filterProjects(projects, { completion }).map(({ slug }) => slug))
      .toEqual(includedDates.map((_, index) => `included-${index}`));
  });

  it("matches a selected room when it is present in either room prices or layouts", () => {
    const projects = [
      project({ slug: "commercial-price", roomPrices: [{ room: "commercial" }] }),
      project({ slug: "commercial-layout", layouts: [{ id: "c-1", room: "commercial", roomLabel: "Торгово-офисное", notes: [] }] }),
      project({ slug: "residential-only", roomPrices: [{ room: "2" }] }),
    ];

    expect(filterProjects(projects, { rooms: ["commercial"] }).map(({ slug }) => slug))
      .toEqual(["commercial-price", "commercial-layout"]);
  });

  it("sorts known prices before missing prices and keeps stable ties", () => {
    const projects = [
      project({ slug: "same-first", minimumPrice: 8_000_000 }),
      project({ slug: "cheap", minimumPrice: 5_000_000 }),
      project({ slug: "same-second", minimumPrice: 8_000_000 }),
      project({ slug: "missing" }),
    ];

    expect(filterProjects(projects, { sort: "price-asc" }).map(({ slug }) => slug))
      .toEqual(["cheap", "same-first", "same-second", "missing"]);
    expect(filterProjects(projects, { sort: "price-desc" }).map(({ slug }) => slug))
      .toEqual(["same-first", "same-second", "cheap", "missing"]);
  });

  it("sorts ready projects first, then completion year and quarter, with missing values last", () => {
    const projects = [
      project({ slug: "2027-q4", completionDate: "2027-Q4" }),
      project({ slug: "ready-first", completionDate: "ready" }),
      project({ slug: "2026-q2", completionDate: "2026-Q2" }),
      project({ slug: "2026-q1", completionDate: "2026-Q1" }),
      project({ slug: "ready-second", completionDate: "ready" }),
      project({ slug: "missing" }),
    ];

    expect(filterProjects(projects, { sort: "completion" }).map(({ slug }) => slug))
      .toEqual(["ready-first", "ready-second", "2026-q1", "2026-q2", "2027-q4", "missing"]);
  });
});
