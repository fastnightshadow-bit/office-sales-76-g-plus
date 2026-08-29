import { createHash } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import sharp from "sharp";
import type { ImageAsset, ImageVariant } from "../../src/features/catalog/catalog.types";
import {
  fetchSourceResponse,
  readResponseBytes,
  ResponseSizeError,
  sourceRequestHeaders,
  SourcePolicyError,
  type SourceNetworkOptions,
} from "./fetch-page";

const PROFILE_WIDTHS = {
  ordinary: [480, 960],
  cover: [480, 960, 1440],
  hero: [480, 960, 1440, 1920],
} as const;
const DEFAULT_MAX_SOURCE_IMAGE_BYTES = 25 * 1024 * 1024;
const downloads = new Map<string, Promise<Buffer>>();
let temporarySequence = 0;
export const IMAGE_CONTENT_FINGERPRINT_ALGORITHM = "sha256-normalized-480-webp" as const;

export class GeneratedMediaBudget {
  #usedBytes = 0;

  constructor(readonly maximumBytes: number) {
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
      throw new RangeError("maximumBytes must be a positive safe integer");
    }
  }

  get usedBytes(): number {
    return this.#usedBytes;
  }

  reserve(bytes: number, destination: string): void {
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw new RangeError("bytes must be a non-negative safe integer");
    const next = this.#usedBytes + bytes;
    if (next > this.maximumBytes) {
      throw new Error(
        `Generated media budget exceeds ${this.maximumBytes} bytes at ${destination}: ${next}`,
      );
    }
    this.#usedBytes = next;
  }

  release(bytes: number): void {
    this.#usedBytes -= bytes;
  }
}

export interface CachedImageResult {
  asset: ImageAsset;
  contentHash: string;
  reused: boolean;
}

export class ContentAssetRegistry {
  readonly #assets = new Map<string, Promise<ImageAsset>>();

  get uniqueAssets(): number {
    return this.#assets.size;
  }

  async use(
    contentHash: string,
    create: () => Promise<ImageAsset>,
  ): Promise<CachedImageResult> {
    const existing = this.#assets.get(contentHash);
    if (existing) {
      return { asset: await existing, contentHash, reused: true };
    }
    const pending = create();
    this.#assets.set(contentHash, pending);
    try {
      return { asset: await pending, contentHash, reused: false };
    } catch (error) {
      if (this.#assets.get(contentHash) === pending) this.#assets.delete(contentHash);
      throw error;
    }
  }
}

export interface CacheImageOptions {
  profile?: keyof typeof PROFILE_WIDTHS;
  maxSourceBytes?: number;
  mediaBudget?: GeneratedMediaBudget;
  contentRegistry?: ContentAssetRegistry;
  network?: SourceNetworkOptions;
}

function publicUrl(filePath: string): string {
  const normalized = filePath.replaceAll("\\", "/");
  const marker = "/public/";
  const index = normalized.lastIndexOf(marker);
  if (index < 0) throw new Error(`Image destination must be inside public/: ${filePath}`);
  return `/${normalized.slice(index + marker.length)}`;
}

async function download(
  url: string,
  maximumBytes: number,
  network: SourceNetworkOptions,
): Promise<Buffer> {
  const key = createHash("sha256").update(url).digest("hex");
  const existing = downloads.get(key);
  if (existing) return existing;

  const pending = (async () => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetchSourceResponse(url, {
          headers: sourceRequestHeaders(),
          signal: AbortSignal.timeout(30_000),
        }, network);
        if (!response.ok) throw new Error(`HTTP ${response.status} for image ${url}`);
        return await readResponseBytes(response, maximumBytes, `Image ${url}`);
      } catch (error) {
        if (error instanceof ResponseSizeError || error instanceof SourcePolicyError) throw error;
        lastError = error;
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
    throw lastError;
  })();
  downloads.set(key, pending);
  try {
    return await pending;
  } finally {
    // Only concurrent requests share the source Buffer. Resolved buffers are
    // released immediately; the content registry below retains metadata only.
    if (downloads.get(key) === pending) downloads.delete(key);
  }
}

/** Clears only the in-flight network download memo; exported for isolated import tests. */
export function resetImageDownloadCache(): void {
  downloads.clear();
}

async function writeGeneratedFile(
  destination: string,
  contents: Buffer,
  budget: GeneratedMediaBudget,
): Promise<void> {
  budget.reserve(contents.byteLength, destination);
  temporarySequence += 1;
  const temporary = `${destination}.${process.pid}.${temporarySequence}.tmp`;
  try {
    await writeFile(temporary, contents);
    await rename(temporary, destination);
  } catch (error) {
    budget.release(contents.byteLength);
    await rm(temporary, { force: true });
    throw error;
  }
}

async function generateImageAsset(
  source: Buffer,
  destinationBase: string,
  profile: keyof typeof PROFILE_WIDTHS,
  budget: GeneratedMediaBudget,
): Promise<ImageAsset> {
  const metadata = await sharp(source).rotate().metadata();
  if (!metadata.width) throw new Error(`Image has no readable width: ${destinationBase}`);
  await mkdir(dirname(destinationBase), { recursive: true });

  const widths = PROFILE_WIDTHS[profile].filter((width) => width <= metadata.width!);
  const variants: ImageVariant[] = [];
  if (widths.length === 0) {
    const fallbackPath = `${destinationBase}.webp`;
    const contents = await sharp(source).rotate().webp({ quality: 82 }).toBuffer();
    await writeGeneratedFile(fallbackPath, contents, budget);
    return { src: publicUrl(fallbackPath), variants };
  }

  for (const width of widths) {
    const avifPath = `${destinationBase}-${width}.avif`;
    const webpPath = `${destinationBase}-${width}.webp`;
    const avif = await sharp(source).rotate().resize({ width, withoutEnlargement: true })
      .avif({ quality: 58 }).toBuffer();
    await writeGeneratedFile(avifPath, avif, budget);
    const webp = await sharp(source).rotate().resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 }).toBuffer();
    await writeGeneratedFile(webpPath, webp, budget);
    variants.push(
      { url: publicUrl(avifPath), width, format: "avif" },
      { url: publicUrl(webpPath), width, format: "webp" },
    );
  }

  const largestWidth = widths.at(-1)!;
  return { src: publicUrl(`${destinationBase}-${largestWidth}.webp`), variants };
}

async function imageContentFingerprint(source: Buffer): Promise<string> {
  const normalized = await sharp(source).rotate().resize({ width: 480, withoutEnlargement: true })
    .webp({ quality: 82 }).toBuffer();
  return createHash("sha256").update(normalized).digest("hex");
}

export async function cacheImageDetailed(
  url: string,
  destinationBase: string,
  options: CacheImageOptions = {},
): Promise<CachedImageResult> {
  const source = await download(
    url,
    options.maxSourceBytes ?? DEFAULT_MAX_SOURCE_IMAGE_BYTES,
    options.network ?? {},
  );
  const contentHash = await imageContentFingerprint(source);
  const budget = options.mediaBudget ?? new GeneratedMediaBudget(Number.MAX_SAFE_INTEGER);
  const create = () => generateImageAsset(source, destinationBase, options.profile ?? "ordinary", budget);
  if (options.contentRegistry) return options.contentRegistry.use(contentHash, create);
  return { asset: await create(), contentHash, reused: false };
}

export async function cacheImage(
  url: string,
  destinationBase: string,
  options: CacheImageOptions = {},
): Promise<ImageAsset> {
  return (await cacheImageDetailed(url, destinationBase, options)).asset;
}
