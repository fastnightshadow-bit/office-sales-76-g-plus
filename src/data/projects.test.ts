import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { catalogSchema } from "../features/catalog/catalog-schema";
import { companyDataSchema, legalDocumentsSchema } from "../features/company/company.types";

function loadJson(name: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), "src/data", name), "utf8"));
}

const companyJson = loadJson("company.json");
const legalJson = loadJson("legal.json");
const projectsJson = loadJson("projects.json");
const projectSummariesJson = loadJson("projects-summary.json");
const reportJson = z.object({
  importedProjects: z.number(),
  duplicateSlugs: z.number(),
  invalidRecords: z.number(),
  discoveredAssetReferences: z.number(),
  selectedAssetReferences: z.number(),
  successfulAssetReferences: z.number(),
  uniqueProjectAssets: z.number(),
  deduplicatedAssetReferences: z.number(),
  deduplicatedGalleryCardOmissions: z.number(),
  omittedAssetReferences: z.number(),
  omittedAssetReferenceReason: z.literal("selection-cap"),
  assetReferenceUnit: z.literal("unique-source-url-role-reference"),
  assetFingerprintAlgorithm: z.literal("sha256-normalized-480-webp"),
  heroAssets: z.literal(1),
  failedAssets: z.number(),
  mediaBytes: z.number(),
  sourceLayouts: z.number(),
  importedLayouts: z.number(),
  normalizedCompletionDates: z.number(),
  missingCompletionLabels: z.number(),
  unparseableCompletionLabels: z.number(),
  unparseableCompletionDetails: z.array(z.object({ slug: z.string(), label: z.string() })),
  untrustedPriceProjects: z.number(),
  untrustedPriceRecords: z.number(),
  priceQualityRecordUnit: z.literal("logical-source-record"),
  untrustedPriceDetails: z.array(z.object({
    projectSlug: z.string(),
    record: z.enum(["project-price-block", "layout"]),
    reason: z.enum(["unitless-sibling-scale-conflict", "joint-layout-scale-outlier"]),
    affectedFields: z.array(z.string()),
    layoutId: z.string().optional(),
    sourceLabels: z.array(z.string()),
  })),
  structuredFeatureSections: z.number(),
  structuredPurchaseProgramSections: z.number(),
}).parse(loadJson("source-report.json"));

describe("generated source snapshot", () => {
  it("keeps the lightweight catalog and per-project details in exact sync", () => {
    const projects = z.array(catalogSchema).length(92).parse(projectsJson);
    const summaries = z.array(z.object({
      slug: z.string(),
      title: z.string(),
      shortDescription: z.string(),
      district: z.string().optional(),
      address: z.string().optional(),
      completionLabel: z.string().optional(),
      completionDate: z.string().optional(),
      minimumPrice: z.number().positive().optional(),
      roomPrices: z.array(z.object({ room: z.string(), minimumPrice: z.number().positive().optional() })),
      availableRooms: z.array(z.string()),
      mortgageRateLabel: z.string().optional(),
      coverImage: z.unknown().optional(),
      relatedProjectSlugs: z.array(z.string()),
      sourceUrl: z.string().url(),
      sourceCheckedAt: z.string(),
      dataQualityFlags: z.array(z.string()),
    }).strict()).length(92).parse(projectSummariesJson);
    const detailDirectory = resolve(process.cwd(), "src/data/project-details");
    const detailFiles = readdirSync(detailDirectory).filter((name) => name.endsWith(".json")).sort();

    expect(detailFiles).toEqual(projects.map(({ slug }) => `${slug}.json`).sort());
    expect(summaries.map(({ slug }) => slug)).toEqual(projects.map(({ slug }) => slug));
    for (const project of projects) {
      expect(loadJson(`project-details/${project.slug}.json`)).toEqual(project);
      const summary = summaries.find(({ slug }) => slug === project.slug)!;
      const availableRooms = [...new Set([
        ...project.roomPrices.map(({ room }) => room),
        ...project.layouts.map(({ room }) => room),
      ])];
      expect(summary).toEqual({
        slug: project.slug,
        title: project.title,
        shortDescription: project.shortDescription,
        ...(project.district ? { district: project.district } : {}),
        ...(project.address ? { address: project.address } : {}),
        ...(project.completionLabel ? { completionLabel: project.completionLabel } : {}),
        ...(project.completionDate ? { completionDate: project.completionDate } : {}),
        ...(project.minimumPrice !== undefined ? { minimumPrice: project.minimumPrice } : {}),
        roomPrices: project.roomPrices,
        availableRooms,
        ...(project.mortgageRateLabel ? { mortgageRateLabel: project.mortgageRateLabel } : {}),
        ...(project.coverImage ? { coverImage: project.coverImage } : {}),
        relatedProjectSlugs: project.relatedProjectSlugs,
        sourceUrl: project.sourceUrl,
        sourceCheckedAt: project.sourceCheckedAt,
        dataQualityFlags: project.dataQualityFlags,
      });
    }
  });

  it("contains exactly 92 valid projects with unique slugs and no zero prices", () => {
    const projects = z.array(catalogSchema).length(92).parse(projectsJson);
    expect(new Set(projects.map((project) => project.slug)).size).toBe(92);
    expect(projects.every((project) => project.minimumPrice !== 0)).toBe(true);
    expect(projects.every((project) => project.sourceUrl && project.sourceCheckedAt)).toBe(true);
    const layouts = projects.flatMap((project) => project.layouts);
    expect(layouts).toHaveLength(1_485);
    expect(layouts.every((layout) => layout.roomLabel.trim().length > 0)).toBe(true);
    for (const project of projects) {
      expect(new Set(project.layouts.map(({ id }) => id)).size).toBe(project.layouts.length);
    }
    expect(reportJson.sourceLayouts).toBe(1_485);
    expect(reportJson.importedLayouts).toBe(1_485);
    expect(projects.every((project) => project.completionDate)).toBe(true);
    expect(reportJson).toMatchObject({
      normalizedCompletionDates: 92,
      missingCompletionLabels: 0,
      unparseableCompletionLabels: 0,
      unparseableCompletionDetails: [],
      untrustedPriceProjects: 2,
      untrustedPriceRecords: 2,
      priceQualityRecordUnit: "logical-source-record",
      structuredFeatureSections: 0,
      structuredPurchaseProgramSections: 0,
    });
    const megapolis = projects.find(({ slug }) => slug === "zhk-megapolis");
    expect(megapolis?.minimumPrice).toBeUndefined();
    expect(megapolis?.roomPrices.find(({ room }) => room === "1")?.minimumPrice).toBeUndefined();
    expect(megapolis?.dataQualityFlags).toContain("untrusted-price");
    const corruptLayout = projects.find(({ slug }) => slug === "zhk-novoe-bragino-dom-2")
      ?.layouts.find(({ id }) => id === "4638995");
    expect(corruptLayout?.price).toBeUndefined();
    expect(corruptLayout?.pricePerMeter).toBeUndefined();
    expect(reportJson.untrustedPriceDetails).toEqual(expect.arrayContaining([
      expect.objectContaining({
        projectSlug: "zhk-megapolis",
        record: "project-price-block",
        affectedFields: expect.arrayContaining(["minimum-price", "room-price:1"]),
      }),
      expect.objectContaining({
        projectSlug: "zhk-novoe-bragino-dom-2",
        record: "layout",
        layoutId: "4638995",
        affectedFields: ["layout-price", "layout-price-per-meter"],
      }),
    ]));
    expect(projects.every((project) => !project.developer || (
      project.developer.length <= 160 && /[a-zа-яё]/i.test(project.developer)
    ))).toBe(true);
    expect(projects.every((project) => project.features.length === 0)).toBe(true);
    expect(projects.every((project) => project.purchasePrograms.length === 0)).toBe(true);
    expect(JSON.stringify(projects)).not.toContain("24\\\\7");
    expect(reportJson).toMatchObject({ importedProjects: 92, duplicateSlugs: 0, invalidRecords: 0 });
  });

  it("references only generated local image files", () => {
    const projects = z.array(catalogSchema).length(92).parse(projectsJson);
    const assets = projects.flatMap((project) => [
      ...(project.coverImage ? [project.coverImage] : []),
      ...project.gallery,
      ...project.layouts.flatMap((layout) => layout.image ? [layout.image] : []),
    ]);
    expect(assets.length).toBeGreaterThan(0);
    for (const asset of assets) {
      expect(asset.src).toMatch(/^\/media\//);
      expect(existsSync(resolve(process.cwd(), "public", asset.src.slice(1)))).toBe(true);
      for (const variant of asset.variants) {
        expect(variant.url).toMatch(/^\/media\//);
        expect(existsSync(resolve(process.cwd(), "public", variant.url.slice(1)))).toBe(true);
      }
    }
    for (const project of projects) {
      expect(project.gallery.length).toBeLessThanOrEqual(4);
      expect(project.layouts.filter((layout) => layout.image).length).toBeLessThanOrEqual(4);
      expect(project.coverImage ? project.gallery.some((image) => image.src === project.coverImage?.src) : false)
        .toBe(false);
      expect(project.gallery.flatMap((image) => image.variants).every(({ width }) => width <= 960)).toBe(true);
      expect(project.layouts.flatMap((layout) => layout.image?.variants ?? [])
        .every(({ width }) => width <= 960)).toBe(true);
      expect((project.coverImage?.variants ?? []).every(({ width }) => width <= 1440)).toBe(true);
    }
    const fingerprints = new Map<string, string>();
    for (const asset of assets) {
      const fingerprintUrl = asset.variants.find(({ width, format }) => width === 480 && format === "webp")?.url
        ?? asset.src;
      const bytes = readFileSync(resolve(process.cwd(), "public", fingerprintUrl.slice(1)));
      const fingerprint = createHash("sha256").update(bytes).digest("hex");
      const existing = fingerprints.get(fingerprint);
      if (existing) expect(fingerprintUrl).toBe(existing);
      else fingerprints.set(fingerprint, fingerprintUrl);
    }
    expect(fingerprints.size).toBe(reportJson.uniqueProjectAssets);
    expect(reportJson.discoveredAssetReferences).toBeGreaterThanOrEqual(reportJson.selectedAssetReferences);
    expect(reportJson.omittedAssetReferences)
      .toBe(reportJson.discoveredAssetReferences - reportJson.selectedAssetReferences);
    expect(reportJson.failedAssets).toBe(0);
    expect(reportJson.successfulAssetReferences)
      .toBe(reportJson.uniqueProjectAssets + reportJson.deduplicatedAssetReferences);
    expect(reportJson.deduplicatedGalleryCardOmissions)
      .toBeLessThanOrEqual(reportJson.deduplicatedAssetReferences);
    expect(reportJson).toMatchObject({
      omittedAssetReferenceReason: "selection-cap",
      assetReferenceUnit: "unique-source-url-role-reference",
      assetFingerprintAlgorithm: "sha256-normalized-480-webp",
    });
    expect(reportJson.heroAssets).toBe(1);
    expect(reportJson.mediaBytes).toBeLessThanOrEqual(300 * 1024 * 1024);
    expect(existsSync(resolve(process.cwd(), "public/media/site/hero-g-plus.webp"))).toBe(true);
    const heroVariants = readdirSync(resolve(process.cwd(), "public/media/site"))
      .filter((file) => /^hero-g-plus-\d+\.(?:avif|webp)$/.test(file));
    expect(heroVariants.some((file) => file.endsWith(".avif"))).toBe(true);
    expect(heroVariants.some((file) => file.endsWith(".webp"))).toBe(true);
    expect(heroVariants.every((file) => Number(file.match(/-(\d+)\./)?.[1]) <= 1920)).toBe(true);
  });

  it("validates company and both source legal documents", () => {
    expect(companyDataSchema.parse(companyJson).brand).toBe("Офис продаж 76");
    expect(legalDocumentsSchema.parse(legalJson).map((document) => document.kind))
      .toEqual(["privacy", "consent"]);
  });
});
