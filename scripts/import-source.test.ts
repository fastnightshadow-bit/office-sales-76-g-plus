import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectDocument } from "../src/features/catalog/catalog.types";
import {
  checkProjectDocuments,
  mapWithConcurrency,
  requestDocument,
  selectProjectMedia,
  assertMediaBudget,
  findDroppedLayoutRecords,
  validateInventory,
} from "./import-source";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("validateInventory", () => {
  it("accepts the expected unique inventory", () => {
    expect(validateInventory([
      "https://example.test/catalog/alpha/",
      "https://example.test/catalog/beta/",
    ], 2)).toEqual({ duplicateSlugs: 0 });
  });

  it("rejects count drift and duplicate normalized slugs", () => {
    expect(() => validateInventory(["https://example.test/catalog/alpha/"], 2))
      .toThrow("Expected 2 projects, received 1");
    expect(() => validateInventory([
      "https://example.test/catalog/shared%20slug/",
      "https://example.test/catalog/shared-slug/",
    ], 2)).toThrow("Duplicate project slugs: shared-slug");
  });
});

describe("selectProjectMedia", () => {
  it("keeps one cover, four unique gallery images and four layout images", () => {
    const selection = selectProjectMedia({
      slug: "primer",
      title: "ЖК Пример",
      sourceUrl: "https://example.test/catalog/primer/",
      sourceCheckedAt: "2026-08-29",
      coverImageUrl: "https://example.test/images/cover.jpg",
      galleryUrls: [
        "https://example.test/images/cover.jpg",
        "https://example.test/images/g1.jpg",
        "https://example.test/images/g1.jpg",
        "https://example.test/images/g2.jpg",
        "https://example.test/images/g3.jpg",
        "https://example.test/images/g4.jpg",
        "https://example.test/images/g5.jpg",
      ],
      layouts: Array.from({ length: 6 }, (_value, index) => ({
        id: `layout-${index + 1}`,
        roomLabel: "1-комнатная",
        imageUrl: `https://example.test/images/layout-${index + 1}.jpg`,
      })),
    });

    expect(selection.galleryUrls).toEqual([
      "https://example.test/images/g1.jpg",
      "https://example.test/images/g2.jpg",
      "https://example.test/images/g3.jpg",
      "https://example.test/images/g4.jpg",
    ]);
    expect(selection.layoutImages.map(({ id }) => id)).toEqual([
      "layout-1", "layout-2", "layout-3", "layout-4",
    ]);
    expect(selection).toMatchObject({ discoveredAssets: 12, selectedAssets: 9, omittedAssets: 3 });
  });

  it("identifies source layout records that normalization would discard", () => {
    expect(findDroppedLayoutRecords({
      slug: "primer",
      title: "ЖК Пример",
      sourceUrl: "https://example.test/catalog/primer/",
      sourceCheckedAt: "2026-08-29",
      layouts: [
        { id: "flat", roomLabel: "2-комнатная", imageUrl: "https://example.test/flat.jpg" },
        { id: "parking", roomLabel: "Машиноместо", imageUrl: "https://example.test/parking.jpg" },
      ],
    })).toEqual([{
      projectSlug: "primer",
      layoutId: "parking",
      roomLabel: "Машиноместо",
      imageUrl: "https://example.test/parking.jpg",
    }]);
  });
});

describe("assertMediaBudget", () => {
  it("rejects promotion above the hard byte limit", () => {
    expect(assertMediaBudget(299, 300)).toBe(299);
    expect(() => assertMediaBudget(301, 300)).toThrow("Media cache exceeds 300 bytes: 301");
  });
});

describe("mapWithConcurrency", () => {
  it("never exceeds the requested concurrency and preserves input order", async () => {
    let active = 0;
    let maximumActive = 0;
    const results = await mapWithConcurrency([4, 1, 3, 2], 2, async (value) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, value));
      active -= 1;
      return value * 10;
    });

    expect(maximumActive).toBe(2);
    expect(results).toEqual([40, 10, 30, 20]);
  });
});

describe("checkProjectDocuments", () => {
  it("checks same-origin documents and leaves external documents unverified", async () => {
    const documents: ProjectDocument[] = [
      { title: "Декларация", url: "https://example.test/files/ok.pdf", status: "unverified" },
      { title: "Ошибка", url: "https://example.test/files/missing.pdf", status: "unverified" },
      { title: "Внешний", url: "https://docs.example.test/file.pdf", status: "unverified" },
    ];
    const requested: string[] = [];
    const result = await checkProjectDocuments(
      documents,
      "https://example.test/catalog/project/",
      async (url) => {
        requested.push(url);
        return url.endsWith("ok.pdf");
      },
    );

    expect(result).toEqual([
      { title: "Декларация", url: "https://example.test/files/ok.pdf", status: "verified" },
      { title: "Ошибка", url: "https://example.test/files/missing.pdf", status: "unverified" },
      { title: "Внешний", url: "https://docs.example.test/file.pdf", status: "unverified" },
    ]);
    expect(requested).toEqual([
      "https://example.test/files/ok.pdf",
      "https://example.test/files/missing.pdf",
    ]);
  });

  it("retries a transient same-origin document check", async () => {
    vi.useFakeTimers();
    let attempts = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      attempts += 1;
      if (attempts === 1) throw new TypeError("temporary network failure");
      return new Response(null, { status: 200 });
    });

    const pending = requestDocument("https://example.test/files/document.pdf");
    await vi.advanceTimersByTimeAsync(500);

    await expect(pending).resolves.toBe(true);
    expect(attempts).toBe(2);
  });
});
