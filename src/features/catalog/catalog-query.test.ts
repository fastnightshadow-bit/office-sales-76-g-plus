import { describe, expect, it } from "vitest";
import { getProjectBySlug, getProjects } from "./catalog-repository";
import type { CatalogQuery } from "./catalog-query";
import { parseCatalogQuery, serializeCatalogQuery } from "./catalog-query";

describe("catalog query URL state", () => {
  it("round-trips exact text and district values through URLSearchParams", () => {
    const query: CatalogQuery = {
      text: "ЖК & центр/новый",
      district: "Центр / набережная",
      rooms: ["1", "2"],
      sort: "price-asc",
    };

    expect(parseCatalogQuery(serializeCatalogQuery(query))).toEqual(query);
  });

  it("validates and deduplicates rooms and enum values while omitting defaults", () => {
    const params = new URLSearchParams([
      ["rooms", "2"],
      ["rooms", "commercial"],
      ["rooms", "2"],
      ["rooms", "penthouse"],
      ["completion", "all"],
      ["sort", "featured"],
    ]);

    expect(parseCatalogQuery(params)).toEqual({ rooms: ["2", "commercial"] });
    expect(serializeCatalogQuery({ completion: "all", sort: "featured" }).toString()).toBe("");
  });

  it("accepts only maximum prices represented by the shared filter options", () => {
    expect(parseCatalogQuery(new URLSearchParams("maximumPrice=7000000"))).toEqual({ maximumPrice: 7_000_000 });
    expect(parseCatalogQuery(new URLSearchParams("maximumPrice=1250000"))).toEqual({});
    expect(parseCatalogQuery(new URLSearchParams("maximumPrice=0"))).toEqual({});
    expect(parseCatalogQuery(new URLSearchParams("maximumPrice=-1"))).toEqual({});
    expect(parseCatalogQuery(new URLSearchParams("maximumPrice=Infinity"))).toEqual({});
    expect(parseCatalogQuery(new URLSearchParams("maximumPrice=not-a-number"))).toEqual({});
  });

  it("omits empty and invalid URL values from canonical output", () => {
    const parsed = parseCatalogQuery(new URLSearchParams(
      "text=&district=&completion=2030&sort=price-desc&rooms=studio&rooms=studio&maximumPrice=1250000",
    ));

    expect(parsed).toEqual({ rooms: ["studio"], sort: "price-desc" });
    expect(serializeCatalogQuery(parsed).toString())
      .toBe("rooms=studio&sort=price-desc");
  });

  it("does not serialize maximum prices that no shared filter can display", () => {
    expect(serializeCatalogQuery({ maximumPrice: 1_250_000 }).toString()).toBe("");
    expect(serializeCatalogQuery({ maximumPrice: 10_000_000 }).toString()).toBe("maximumPrice=10000000");
  });
});

describe("catalog repository", () => {
  it("loads the validated generated snapshot and resolves projects by slug", () => {
    expect(getProjects()).toHaveLength(92);
    expect(getProjectBySlug("3-shoseynaya-20")?.slug).toBe("3-shoseynaya-20");
    expect(getProjectBySlug("missing-project")).toBeUndefined();
  });

  it("keeps the canonical snapshot stable when a caller attempts mutation", () => {
    const projects = getProjects();
    const originalTitle = projects[0]?.title;
    expect(() => {
      (projects[0] as { title: string }).title = "Изменено";
    }).toThrow();
    expect(getProjects()[0]?.title).toBe(originalTitle);
  });
});
