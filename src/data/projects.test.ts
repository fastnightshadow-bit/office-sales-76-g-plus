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
const reportJson = z.object({
  importedProjects: z.number(),
  duplicateSlugs: z.number(),
  invalidRecords: z.number(),
  discoveredAssets: z.number(),
  selectedAssets: z.number(),
  omittedAssets: z.number(),
  cachedImages: z.number(),
  failedAssets: z.number(),
  mediaBytes: z.number(),
  sourceLayouts: z.number(),
  importedLayouts: z.number(),
}).parse(loadJson("source-report.json"));

describe("generated source snapshot", () => {
  it("contains exactly 92 valid projects with unique slugs and no zero prices", () => {
    const projects = z.array(catalogSchema).length(92).parse(projectsJson);
    expect(new Set(projects.map((project) => project.slug)).size).toBe(92);
    expect(projects.every((project) => project.minimumPrice !== 0)).toBe(true);
    expect(projects.every((project) => project.sourceUrl && project.sourceCheckedAt)).toBe(true);
    const layouts = projects.flatMap((project) => project.layouts);
    expect(layouts.every((layout) => layout.roomLabel.trim().length > 0)).toBe(true);
    expect(reportJson.sourceLayouts).toBe(layouts.length);
    expect(reportJson.importedLayouts).toBe(layouts.length);
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
    expect(reportJson.discoveredAssets).toBeGreaterThanOrEqual(reportJson.selectedAssets);
    expect(reportJson.omittedAssets).toBe(reportJson.discoveredAssets - reportJson.selectedAssets);
    expect(reportJson.failedAssets).toBe(0);
    expect(reportJson.cachedImages).toBe(reportJson.selectedAssets + 1);
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
