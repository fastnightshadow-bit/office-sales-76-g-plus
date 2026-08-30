import { copyFile, mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { writeCatalogArtifacts } from "./write-catalog-artifacts";
import { z } from "zod";
import { catalogSchema, sourceProjectInputSchema } from "../src/features/catalog/catalog-schema";
import type {
  ImageAsset,
  Project,
  ProjectDocument,
  SourceProjectInput,
} from "../src/features/catalog/catalog.types";
import {
  findUntrustedPriceRecords,
  normalizeProject,
} from "../src/features/catalog/normalize-project";
import {
  companyDataSchema,
  legalDocumentsSchema,
} from "../src/features/company/company.types";
import {
  cacheImage,
  cacheImageDetailed,
  ContentAssetRegistry,
  GeneratedMediaBudget,
  IMAGE_CONTENT_FINGERPRINT_ALGORITHM,
  resetImageDownloadCache,
} from "./source/asset-cache";
import {
  fetchPage,
  fetchSourceResponse,
  sourceRequestHeaders,
  type SourceNetworkOptions,
} from "./source/fetch-page";
import { parseCompany, parseLegalDocument } from "./source/parse-company";
import {
  parseProjectIndexEntries,
  type ProjectIndexEntry,
} from "./source/parse-project-index";
import { parseProjectPage } from "./source/parse-project";

export const EXPECTED_PROJECT_COUNT = 92;
export const SOURCE_ROOT = "https://офиспродаж76.рф";
const CONCURRENCY = 4;
export const MAX_MEDIA_BYTES = 300 * 1024 * 1024;

function normalizedSlug(url: string): string {
  const raw = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "");
  return raw.trim().replace(/\s+/g, "-");
}

export function validateInventory(projectUrls: readonly string[], expected = EXPECTED_PROJECT_COUNT): {
  duplicateSlugs: number;
} {
  if (projectUrls.length !== expected) {
    throw new Error(`Expected ${expected} projects, received ${projectUrls.length}`);
  }
  const slugs = projectUrls.map(normalizedSlug);
  const duplicates = [...new Set(slugs.filter((slug, index) => slugs.indexOf(slug) !== index))];
  if (duplicates.length) throw new Error(`Duplicate project slugs: ${duplicates.join(", ")}`);
  return { duplicateSlugs: 0 };
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("concurrency must be a positive integer");
  }
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index]!, index);
    }
  });
  await Promise.all(workers);
  return results;
}

export interface ProjectMediaSelection {
  coverUrl?: string;
  galleryUrls: string[];
  layoutImages: Array<{ ids: string[]; url: string }>;
  discoveredAssets: number;
  selectedAssets: number;
  omittedAssets: number;
}

export function selectProjectMedia(input: SourceProjectInput): ProjectMediaSelection {
  const coverUrl = input.coverImageUrl;
  const uniqueGallery = [...new Set((input.galleryUrls ?? []).filter((url) => url !== coverUrl))];
  const layoutImages = new Map<string, string[]>();
  for (const layout of input.layouts ?? []) {
    if (!layout.imageUrl) continue;
    const ids = layoutImages.get(layout.imageUrl) ?? [];
    ids.push(layout.id);
    layoutImages.set(layout.imageUrl, ids);
  }
  const layoutCandidates = [...layoutImages].map(([url, ids]) => ({ ids, url }));
  const discoveredAssets = (coverUrl ? 1 : 0) + uniqueGallery.length + layoutCandidates.length;
  const selectedGallery = uniqueGallery.slice(0, 4);
  const selectedLayouts = layoutCandidates.slice(0, 4);
  const selectedAssets = (coverUrl ? 1 : 0) + selectedGallery.length + selectedLayouts.length;
  const selection: ProjectMediaSelection = {
    galleryUrls: selectedGallery,
    layoutImages: selectedLayouts,
    discoveredAssets,
    selectedAssets,
    omittedAssets: discoveredAssets - selectedAssets,
  };
  if (coverUrl) selection.coverUrl = coverUrl;
  return selection;
}

export interface DroppedLayoutRecord {
  projectSlug: string;
  layoutId: string;
  roomLabel?: string;
  imageUrl?: string;
}

/** Reports every source layout that the Task 2 normalizer cannot represent. */
export function findDroppedLayoutRecords(input: SourceProjectInput): DroppedLayoutRecord[] {
  return (input.layouts ?? []).flatMap((layout) => {
    if (normalizeProject({ ...input, layouts: [layout] }).layouts.length === 1) return [];
    const dropped: DroppedLayoutRecord = {
      projectSlug: input.slug,
      layoutId: layout.id,
    };
    if (layout.roomLabel) dropped.roomLabel = layout.roomLabel;
    if (layout.imageUrl) dropped.imageUrl = layout.imageUrl;
    return [dropped];
  });
}

export function assertMediaBudget(bytes: number, maximumBytes = MAX_MEDIA_BYTES): number {
  if (bytes > maximumBytes) {
    throw new Error(`Media cache exceeds ${maximumBytes} bytes: ${bytes}`);
  }
  return bytes;
}

type DocumentRequest = (url: string) => Promise<boolean>;

export async function checkProjectDocuments(
  documents: readonly ProjectDocument[],
  projectSourceUrl: string,
  request: DocumentRequest,
): Promise<ProjectDocument[]> {
  const sourceOrigin = new URL(projectSourceUrl).origin;
  return Promise.all(documents.map(async (document) => {
    if (new URL(document.url).origin !== sourceOrigin) return { ...document, status: "unverified" };
    const verified = await request(document.url).catch(() => false);
    return { ...document, status: verified ? "verified" : "unverified" };
  }));
}

function mergeIndexEntry(input: SourceProjectInput, entry: ProjectIndexEntry): SourceProjectInput {
  const merged: SourceProjectInput = { ...input };
  if (!merged.shortDescription && entry.shortDescription) merged.shortDescription = entry.shortDescription;
  if (!merged.district && entry.district) merged.district = entry.district;
  if (!merged.completionLabel && entry.completionLabel) merged.completionLabel = entry.completionLabel;
  if (!merged.minimumPriceLabel && entry.minimumPriceLabel) merged.minimumPriceLabel = entry.minimumPriceLabel;
  if (!merged.coverImageUrl && entry.coverImageUrl) merged.coverImageUrl = entry.coverImageUrl;
  return merged;
}

function safeSegment(value: string): string {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
}

function ordinaryImageAsset(asset: ImageAsset): ImageAsset {
  const variants = asset.variants.filter(({ width }) => width <= 960);
  const largestWebp = variants
    .filter(({ format }) => format === "webp")
    .sort((left, right) => right.width - left.width)[0];
  return {
    src: largestWebp?.url ?? asset.src,
    variants,
  };
}

interface FailedAsset {
  projectSlug: string;
  kind: "cover" | "gallery" | "layout";
  sourceUrl: string;
  error: string;
}

export interface MediaCounters {
  logicalReferences: number;
  successfulReferences: number;
  reusedReferences: number;
  omittedDuplicateGalleryCards: number;
  variants: number;
}

export interface MediaAuditReport {
  discoveredAssetReferences: number;
  selectedAssetReferences: number;
  successfulAssetReferences: number;
  uniqueProjectAssets: number;
  deduplicatedAssetReferences: number;
  deduplicatedGalleryCardOmissions: number;
  omittedAssetReferences: number;
  omittedAssetReferenceReason: "selection-cap";
  assetReferenceUnit: "unique-source-url-role-reference";
  assetFingerprintAlgorithm: typeof IMAGE_CONTENT_FINGERPRINT_ALGORITHM;
}

export function createMediaAuditReport(
  discoveredAssetReferences: number,
  uniqueProjectAssets: number,
  counters: MediaCounters,
): MediaAuditReport {
  if (counters.successfulReferences !== uniqueProjectAssets + counters.reusedReferences) {
    throw new Error("Successful asset references must equal unique assets plus deduplicated references");
  }
  if (counters.logicalReferences > discoveredAssetReferences) {
    throw new Error("Selected asset references cannot exceed discovered references");
  }
  if (counters.omittedDuplicateGalleryCards > counters.reusedReferences) {
    throw new Error("Omitted duplicate gallery cards cannot exceed deduplicated references");
  }
  return {
    discoveredAssetReferences,
    selectedAssetReferences: counters.logicalReferences,
    successfulAssetReferences: counters.successfulReferences,
    uniqueProjectAssets,
    deduplicatedAssetReferences: counters.reusedReferences,
    deduplicatedGalleryCardOmissions: counters.omittedDuplicateGalleryCards,
    omittedAssetReferences: discoveredAssetReferences - counters.logicalReferences,
    omittedAssetReferenceReason: "selection-cap",
    assetReferenceUnit: "unique-source-url-role-reference",
    assetFingerprintAlgorithm: IMAGE_CONTENT_FINGERPRINT_ALGORITHM,
  };
}

export interface CacheProjectMediaOptions {
  contentRegistry: ContentAssetRegistry;
  mediaBudget: GeneratedMediaBudget;
  network?: SourceNetworkOptions;
}

export async function cacheProjectMedia(
  input: SourceProjectInput,
  project: Project,
  publicRoot: string,
  failedAssets: FailedAsset[],
  counters: MediaCounters,
  onAssetAttempt: () => void,
  options: CacheProjectMediaOptions,
): Promise<Project> {
  const projectDirectory = join(publicRoot, "media/projects", safeSegment(project.slug));
  const selection = selectProjectMedia(input);
  const cache = async (
    url: string,
    base: string,
    profile: "ordinary" | "cover" = "ordinary",
  ) => {
    counters.logicalReferences += 1;
    const result = await cacheImageDetailed(url, join(projectDirectory, base), {
      profile,
      contentRegistry: options.contentRegistry,
      mediaBudget: options.mediaBudget,
      ...(options.network ? { network: options.network } : {}),
    });
    counters.successfulReferences += 1;
    if (result.reused) counters.reusedReferences += 1;
    else counters.variants += result.asset.variants.length;
    return result;
  };

  let coverContentHash: string | undefined;
  if (selection.coverUrl) {
    try {
      const cached = await cache(selection.coverUrl, "cover", "cover");
      project.coverImage = cached.asset;
      coverContentHash = cached.contentHash;
      project.dataQualityFlags = project.dataQualityFlags.filter((flag) => flag !== "missing-cover");
    } catch (error) {
      delete project.coverImage;
      if (!project.dataQualityFlags.includes("missing-cover")) project.dataQualityFlags.push("missing-cover");
      failedAssets.push({
        projectSlug: project.slug,
        kind: "cover",
        sourceUrl: selection.coverUrl,
        error: String(error),
      });
    } finally {
      onAssetAttempt();
    }
  }

  const gallery: ImageAsset[] = [];
  const galleryContentHashes = new Set(coverContentHash ? [coverContentHash] : []);
  for (const [index, url] of selection.galleryUrls.entries()) {
    try {
      const cached = await cache(url, `gallery-${String(index + 1).padStart(3, "0")}`);
      if (!galleryContentHashes.has(cached.contentHash)) {
        galleryContentHashes.add(cached.contentHash);
        gallery.push(ordinaryImageAsset(cached.asset));
      } else {
        counters.omittedDuplicateGalleryCards += 1;
      }
    } catch (error) {
      failedAssets.push({
        projectSlug: project.slug,
        kind: "gallery",
        sourceUrl: url,
        error: String(error),
      });
    } finally {
      onAssetAttempt();
    }
  }
  project.gallery = gallery;

  const layoutAssets = new Map<string, ImageAsset>();
  for (const [index, { ids, url }] of selection.layoutImages.entries()) {
    try {
      const cached = await cache(
        url,
        `layout-${safeSegment(ids[0] ?? String(index + 1))}`,
      );
      const layoutAsset = ordinaryImageAsset(cached.asset);
      for (const id of ids) layoutAssets.set(id, layoutAsset);
    } catch (error) {
      failedAssets.push({
        projectSlug: project.slug,
        kind: "layout",
        sourceUrl: url,
        error: String(error),
      });
    } finally {
      onAssetAttempt();
    }
  }
  for (const layout of project.layouts) {
    delete layout.image;
    const asset = layoutAssets.get(layout.id);
    if (asset) layout.image = asset;
  }
  return project;
}

async function replaceDirectory(staged: string, destination: string): Promise<void> {
  await mkdir(dirname(destination), { recursive: true });
  await rm(destination, { recursive: true, force: true });
  await rename(staged, destination);
}

async function directorySize(directory: string): Promise<number> {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) total += await directorySize(path);
    else if (entry.isFile()) total += (await stat(path)).size;
  }
  return total;
}

export async function requestDocument(
  url: string,
  network: SourceNetworkOptions = {},
): Promise<boolean> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetchSourceResponse(url, {
        method: "HEAD",
        headers: sourceRequestHeaders(),
        signal: AbortSignal.timeout(15_000),
      }, network);
      if (response.ok) return true;
      if (response.status < 500 && response.status !== 405) return false;
    } catch {
      // Retry timeouts and transient network failures once.
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

export interface SourceReport extends MediaAuditReport {
  importedProjects: number;
  duplicateSlugs: number;
  invalidRecords: number;
  missingPrices: number;
  normalizedCompletionDates: number;
  missingCompletionLabels: number;
  unparseableCompletionLabels: number;
  unparseableCompletionDetails: Array<{ slug: string; label: string }>;
  untrustedPriceProjects: number;
  untrustedPriceRecords: number;
  priceQualityRecordUnit: "logical-source-record";
  untrustedPriceDetails: Array<ReturnType<typeof findUntrustedPriceRecords>[number] & { projectSlug: string }>;
  missingCovers: number;
  failedAssets: number;
  heroAssets: 1;
  imageVariants: number;
  mediaBytes: number;
  verifiedDocuments: number;
  unverifiedDocuments: number;
  sourceLayouts: number;
  importedLayouts: number;
  structuredFeatureSections: number;
  structuredPurchaseProgramSections: number;
  sourceCheckedAt: string;
  failedAssetDetails: FailedAsset[];
}

export interface FreshStaging {
  root: string;
  public: string;
  data: string;
}

export async function prepareFreshStaging(rootDirectory: string): Promise<FreshStaging> {
  const root = join(rootDirectory, "work/source-import-staging");
  await rm(root, { recursive: true, force: true });
  const staging: FreshStaging = {
    root,
    public: join(root, "public"),
    data: join(root, "data"),
  };
  await mkdir(staging.data, { recursive: true });
  return staging;
}

export async function importSource(rootDirectory = resolve(".")): Promise<SourceReport> {
  const checkedAt = new Date().toISOString().slice(0, 10);
  const staging = await prepareFreshStaging(rootDirectory);
  const stagingRoot = staging.root;
  const stagingPublic = staging.public;
  const stagingData = staging.data;
  resetImageDownloadCache();

  const namedPages = [
    ["catalog", `${SOURCE_ROOT}/catalog-list/`],
    ["home", `${SOURCE_ROOT}/`],
    ["about", `${SOURCE_ROOT}/about/`],
    ["privacy", `${SOURCE_ROOT}/policy/`],
    ["consent", `${SOURCE_ROOT}/agreement/`],
  ] as const;
  console.log("Fetching source index and company/legal pages (5 total)...");
  const namedHtml = await Promise.all(namedPages.map(async ([name, url]) => {
    const html = await fetchPage(url);
    console.log(`Fetched source page: ${name}`);
    return html;
  }));
  const catalogHtml = namedHtml[0]!;
  const aboutHtml = namedHtml[2]!;
  const policyHtml = namedHtml[3]!;
  const agreementHtml = namedHtml[4]!;
  const entries = parseProjectIndexEntries(catalogHtml, SOURCE_ROOT);
  const inventory = validateInventory(entries.map(({ sourceUrl }) => sourceUrl));
  console.log(`Validated unique project URLs: ${entries.length}`);
  let fetchedProjects = 0;
  const pageHtml = await mapWithConcurrency(entries, CONCURRENCY, async (entry) => {
    const html = await fetchPage(entry.sourceUrl);
    fetchedProjects += 1;
    if (fetchedProjects % 5 === 0 || fetchedProjects === entries.length) {
      console.log(`Fetched project pages: ${fetchedProjects}/${entries.length}`);
    }
    return html;
  });
  const parsedInputs = entries.map((entry, index) => {
    const parsed = mergeIndexEntry(
      parseProjectPage(pageHtml[index]!, entry.sourceUrl, checkedAt),
      entry,
    );
    sourceProjectInputSchema.parse(parsed);
    return parsed;
  });
  const droppedLayouts = parsedInputs.flatMap(findDroppedLayoutRecords);
  if (droppedLayouts.length) {
    throw new Error(
      `Normalization would drop ${droppedLayouts.length} source layout records:\n${JSON.stringify(droppedLayouts, null, 2)}`,
    );
  }
  const untrustedPriceDetails = parsedInputs.flatMap((input) => (
    findUntrustedPriceRecords(input).map((issue) => ({ projectSlug: input.slug, ...issue }))
  ));
  const mediaSelections = parsedInputs.map(selectProjectMedia);
  const discoveredAssets = mediaSelections.reduce((total, selection) => total + selection.discoveredAssets, 0);
  const selectedAssets = mediaSelections.reduce((total, selection) => total + selection.selectedAssets, 0);
  console.log(
    `Parsed project records: ${parsedInputs.length}; discovered media assets: ${discoveredAssets}; selected: ${selectedAssets}`,
  );

  const checkedDocuments = new Map<string, Promise<boolean>>();
  const documentRequest: DocumentRequest = (url) => {
    const existing = checkedDocuments.get(url);
    if (existing) return existing;
    const pending = requestDocument(url);
    checkedDocuments.set(url, pending);
    return pending;
  };
  const failedAssets: FailedAsset[] = [];
  const counters: MediaCounters = {
    logicalReferences: 0,
    successfulReferences: 0,
    reusedReferences: 0,
    omittedDuplicateGalleryCards: 0,
    variants: 0,
  };
  const contentRegistry = new ContentAssetRegistry();
  const mediaBudget = new GeneratedMediaBudget(MAX_MEDIA_BYTES);
  let completed = 0;
  let processedMediaAssets = 0;
  const projects = await mapWithConcurrency(parsedInputs, CONCURRENCY, async (parsed) => {
    parsed.documents = await checkProjectDocuments(
      parsed.documents ?? [],
      parsed.sourceUrl,
      documentRequest,
    );
    const validatedInput = parsed;
    const project = await cacheProjectMedia(
      validatedInput,
      normalizeProject(validatedInput),
      stagingPublic,
      failedAssets,
      counters,
      () => {
        processedMediaAssets += 1;
        if (processedMediaAssets % 25 === 0 || processedMediaAssets === selectedAssets) {
          console.log(`Processed media assets: ${processedMediaAssets}/${selectedAssets}`);
        }
      },
      { contentRegistry, mediaBudget },
    );
    completed += 1;
    if (completed % 10 === 0 || completed === entries.length) {
      console.log(`Cached project media: ${completed}/${entries.length}`);
    }
    return project;
  });
  projects.sort((left, right) => left.slug.localeCompare(right.slug, "en"));
  const validatedProjects = z.array(catalogSchema).length(EXPECTED_PROJECT_COUNT).parse(projects);

  const company = companyDataSchema.parse(parseCompany({ aboutHtml, catalogHtml, checkedAt }));
  const legal = legalDocumentsSchema.parse([
    parseLegalDocument(policyHtml, "privacy", `${SOURCE_ROOT}/policy/`, checkedAt),
    parseLegalDocument(agreementHtml, "consent", `${SOURCE_ROOT}/agreement/`, checkedAt),
  ]);

  const heroSource = entries.find((entry) => normalizedSlug(entry.sourceUrl) === "zhk-novatsiya")?.coverImageUrl
    ?? entries.find((entry) => entry.coverImageUrl)?.coverImageUrl;
  if (!heroSource) throw new Error("No source photograph is available for the G+ hero");
  const heroAsset = await cacheImage(
    heroSource,
    join(stagingPublic, "media/site/hero-g-plus"),
    { profile: "hero", mediaBudget },
  );
  const heroSourceFile = join(stagingPublic, heroAsset.src.slice(1));
  const heroFile = join(stagingPublic, "media/site/hero-g-plus.webp");
  const heroAliasBytes = (await stat(heroSourceFile)).size;
  mediaBudget.reserve(heroAliasBytes, heroFile);
  try {
    await copyFile(heroSourceFile, heroFile);
  } catch (error) {
    mediaBudget.release(heroAliasBytes);
    throw error;
  }
  const mediaBytes = assertMediaBudget(await directorySize(join(stagingPublic, "media")));

  const verifiedDocuments = validatedProjects.flatMap((project) => project.documents)
    .filter((document) => document.status === "verified").length;
  const unverifiedDocuments = validatedProjects.flatMap((project) => project.documents)
    .filter((document) => document.status === "unverified").length;
  const mediaAudit = createMediaAuditReport(discoveredAssets, contentRegistry.uniqueAssets, counters);
  const report: SourceReport = {
    importedProjects: validatedProjects.length,
    duplicateSlugs: inventory.duplicateSlugs,
    invalidRecords: 0,
    missingPrices: validatedProjects.filter((project) => project.dataQualityFlags.includes("missing-price")).length,
    normalizedCompletionDates: validatedProjects.filter((project) => project.completionDate).length,
    missingCompletionLabels: validatedProjects
      .filter((project) => project.dataQualityFlags.includes("missing-completion")).length,
    unparseableCompletionLabels: validatedProjects
      .filter((project) => project.dataQualityFlags.includes("unparseable-completion")).length,
    unparseableCompletionDetails: validatedProjects.flatMap((project) => (
      project.dataQualityFlags.includes("unparseable-completion") && project.completionLabel
        ? [{ slug: project.slug, label: project.completionLabel }]
        : []
    )),
    untrustedPriceProjects: validatedProjects
      .filter((project) => project.dataQualityFlags.includes("untrusted-price")).length,
    untrustedPriceRecords: untrustedPriceDetails.length,
    priceQualityRecordUnit: "logical-source-record",
    untrustedPriceDetails,
    missingCovers: validatedProjects.filter((project) => project.dataQualityFlags.includes("missing-cover")).length,
    failedAssets: failedAssets.length,
    ...mediaAudit,
    heroAssets: 1,
    imageVariants: counters.variants + heroAsset.variants.length,
    mediaBytes,
    verifiedDocuments,
    unverifiedDocuments,
    sourceLayouts: parsedInputs.reduce((total, input) => total + (input.layouts?.length ?? 0), 0),
    importedLayouts: validatedProjects.reduce((total, project) => total + project.layouts.length, 0),
    structuredFeatureSections: parsedInputs.filter((input) => input.features !== undefined).length,
    structuredPurchaseProgramSections: parsedInputs
      .filter((input) => input.purchasePrograms !== undefined).length,
    sourceCheckedAt: checkedAt,
    failedAssetDetails: failedAssets,
  };

  const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
  await Promise.all([
    writeFile(join(stagingData, "projects.json"), json(validatedProjects), "utf8"),
    writeFile(join(stagingData, "company.json"), json(company), "utf8"),
    writeFile(join(stagingData, "legal.json"), json(legal), "utf8"),
    writeFile(join(stagingData, "source-report.json"), json(report), "utf8"),
  ]);
  await writeCatalogArtifacts(validatedProjects as Project[], stagingData);
  await replaceDirectory(join(stagingPublic, "media/projects"), join(rootDirectory, "public/media/projects"));
  await replaceDirectory(join(stagingPublic, "media/site"), join(rootDirectory, "public/media/site"));
  await mkdir(join(rootDirectory, "src/data"), { recursive: true });
  await replaceDirectory(join(stagingData, "project-details"), join(rootDirectory, "src/data/project-details"));
  for (const name of ["projects.json", "projects-summary.json", "company.json", "legal.json", "source-report.json"]) {
    await rename(join(stagingData, name), join(rootDirectory, "src/data", name));
  }
  await rm(stagingRoot, { recursive: true, force: true });

  console.log(`Imported projects: ${report.importedProjects}`);
  console.log(`Duplicate slugs: ${report.duplicateSlugs}`);
  console.log(`Invalid records: ${report.invalidRecords}`);
  return report;
}

const entryPoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (entryPoint === import.meta.url) {
  importSource().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
