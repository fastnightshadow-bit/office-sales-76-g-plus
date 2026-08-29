import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectDocument } from "../src/features/catalog/catalog.types";
import { normalizeProject } from "../src/features/catalog/normalize-project";
import { ContentAssetRegistry, GeneratedMediaBudget } from "./source/asset-cache";
import {
  cacheProjectMedia,
  createMediaAuditReport,
  checkProjectDocuments,
  mapWithConcurrency,
  requestDocument,
  selectProjectMedia,
  assertMediaBudget,
  findDroppedLayoutRecords,
  prepareFreshStaging,
  validateInventory,
} from "./import-source";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, {
    recursive: true,
    force: true,
  })));
});

describe("prepareFreshStaging", () => {
  it("removes a stale partial import before assigning a new checked date", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-76-import-"));
    temporaryDirectories.push(root);
    const stale = join(root, "work/source-import-staging/source-pages/stale.html");
    await mkdir(join(stale, ".."), { recursive: true });
    await writeFile(stale, "yesterday", "utf8");

    const staging = await prepareFreshStaging(root);

    await expect(access(stale)).rejects.toThrow();
    await expect(access(staging.data)).resolves.toBeUndefined();
  });
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
        imageUrl: `https://example.test/images/layout-${index === 1 ? 1 : index + 1}.jpg`,
      })),
    });

    expect(selection.galleryUrls).toEqual([
      "https://example.test/images/g1.jpg",
      "https://example.test/images/g2.jpg",
      "https://example.test/images/g3.jpg",
      "https://example.test/images/g4.jpg",
    ]);
    expect(selection.layoutImages.map(({ ids }) => ids[0])).toEqual([
      "layout-1", "layout-3", "layout-4", "layout-5",
    ]);
    expect(selection.layoutImages[0]).toMatchObject({ ids: ["layout-1", "layout-2"] });
    expect(selection).toMatchObject({ discoveredAssets: 11, selectedAssets: 9, omittedAssets: 2 });
  });

  it("deduplicates cover/gallery and layout content while preserving layout references", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-76-media-"));
    temporaryDirectories.push(root);
    const colors = {
      cover: await sharp({ create: { width: 500, height: 300, channels: 3, background: "#17221d" } }).png().toBuffer(),
      gallery: await sharp({ create: { width: 500, height: 300, channels: 3, background: "#718277" } }).png().toBuffer(),
      layout: await sharp({ create: { width: 500, height: 300, channels: 3, background: "#f4f6f3" } }).png().toBuffer(),
    };
    vi.spyOn(globalThis, "fetch").mockImplementation(async (request) => {
      const url = String(request);
      const content = url.includes("cover") || url.includes("cover-copy")
        ? colors.cover
        : url.includes("gallery")
          ? colors.gallery
          : colors.layout;
      return new Response(new Uint8Array(content), { status: 200 });
    });
    const input = {
      slug: "primer",
      title: "ЖК Пример",
      sourceUrl: "https://example.test/catalog/primer/",
      sourceCheckedAt: "2026-08-29",
      coverImageUrl: "https://example.test/cover.png",
      galleryUrls: [
        "https://example.test/cover-copy.png",
        "https://example.test/gallery-a.png",
        "https://example.test/gallery-b.png",
      ],
      layouts: [
        { id: "layout-1", roomLabel: "1-комнатная", imageUrl: "https://example.test/layout-a.png" },
        { id: "layout-2", roomLabel: "2-комнатная", imageUrl: "https://example.test/layout-b.png" },
        { id: "layout-3", roomLabel: "3-комнатная", imageUrl: "https://example.test/layout-a.png" },
      ],
    };
    const registry = new ContentAssetRegistry();
    const counters = {
      logicalReferences: 0,
      successfulReferences: 0,
      reusedReferences: 0,
      omittedDuplicateGalleryCards: 0,
      variants: 0,
    };

    const project = await cacheProjectMedia(
      input,
      normalizeProject(input),
      join(root, "public"),
      [],
      counters,
      () => undefined,
      {
        contentRegistry: registry,
        mediaBudget: new GeneratedMediaBudget(10 * 1024 * 1024),
        network: {
          allowedHostnames: ["example.test"],
          resolveHost: async () => ["93.184.216.34"],
        },
      },
    );

    expect(project.gallery).toHaveLength(1);
    expect(project.gallery[0]?.src).not.toBe(project.coverImage?.src);
    expect(project.layouts.map((layout) => layout.image?.src)).toEqual([
      project.layouts[0]?.image?.src,
      project.layouts[0]?.image?.src,
      project.layouts[0]?.image?.src,
    ]);
    expect(registry.uniqueAssets).toBe(3);
    expect(counters).toMatchObject({
      logicalReferences: 6,
      successfulReferences: 6,
      reusedReferences: 3,
      omittedDuplicateGalleryCards: 2,
    });
  });

  it("projects a reused cover asset to the ordinary 960px profile for another project's gallery", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-76-media-"));
    temporaryDirectories.push(root);
    const source = await sharp({
      create: { width: 2_000, height: 1_200, channels: 3, background: "#17221d" },
    }).png().toBuffer();
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => (
      new Response(new Uint8Array(source), { status: 200 })
    ));
    const registry = new ContentAssetRegistry();
    const mediaBudget = new GeneratedMediaBudget(20 * 1024 * 1024);
    const counters = {
      logicalReferences: 0,
      successfulReferences: 0,
      reusedReferences: 0,
      omittedDuplicateGalleryCards: 0,
      variants: 0,
    };
    const options = {
      contentRegistry: registry,
      mediaBudget,
      network: {
        allowedHostnames: ["example.test"],
        resolveHost: async () => ["93.184.216.34"],
      },
    };
    const coverInput = {
      slug: "cover-project",
      title: "Cover",
      sourceUrl: "https://example.test/catalog/cover-project/",
      sourceCheckedAt: "2026-08-29",
      coverImageUrl: "https://example.test/shared.png",
    };
    const galleryInput = {
      slug: "gallery-project",
      title: "Gallery",
      sourceUrl: "https://example.test/catalog/gallery-project/",
      sourceCheckedAt: "2026-08-29",
      galleryUrls: ["https://example.test/shared-copy.png"],
    };

    const coverProject = await cacheProjectMedia(
      coverInput, normalizeProject(coverInput), join(root, "public"), [], counters, () => undefined, options,
    );
    const galleryProject = await cacheProjectMedia(
      galleryInput, normalizeProject(galleryInput), join(root, "public"), [], counters, () => undefined, options,
    );

    expect(coverProject.coverImage?.variants.some(({ width }) => width === 1_440)).toBe(true);
    expect(galleryProject.gallery[0]?.src).toMatch(/-960\.webp$/);
    expect(galleryProject.gallery[0]?.variants.every(({ width }) => width <= 960)).toBe(true);
    expect(registry.uniqueAssets).toBe(1);
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

describe("createMediaAuditReport", () => {
  it("reports source references, content reuse, and gallery omissions with explicit units", () => {
    expect(createMediaAuditReport(11, 3, {
      logicalReferences: 6,
      successfulReferences: 6,
      reusedReferences: 3,
      omittedDuplicateGalleryCards: 2,
      variants: 10,
    })).toEqual({
      discoveredAssetReferences: 11,
      selectedAssetReferences: 6,
      successfulAssetReferences: 6,
      uniqueProjectAssets: 3,
      deduplicatedAssetReferences: 3,
      deduplicatedGalleryCardOmissions: 2,
      omittedAssetReferences: 5,
      omittedAssetReferenceReason: "selection-cap",
      assetReferenceUnit: "unique-source-url-role-reference",
      assetFingerprintAlgorithm: "sha256-normalized-480-webp",
    });
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

    const pending = requestDocument("https://example.test/files/document.pdf", {
      allowedHostnames: ["example.test"],
      resolveHost: async () => ["93.184.216.34"],
    });
    await vi.advanceTimersByTimeAsync(500);

    await expect(pending).resolves.toBe(true);
    expect(attempts).toBe(2);
  });
});
