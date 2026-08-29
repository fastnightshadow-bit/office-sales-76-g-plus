import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import sharp from "sharp";
import type { ImageAsset, ImageVariant } from "../../src/features/catalog/catalog.types";
import { sourceRequestHeaders } from "./fetch-page";

const PROFILE_WIDTHS = {
  ordinary: [480, 960],
  cover: [480, 960, 1440],
  hero: [480, 960, 1440, 1920],
} as const;
const downloads = new Map<string, Promise<Buffer>>();

export interface CacheImageOptions {
  profile?: keyof typeof PROFILE_WIDTHS;
}

function publicUrl(filePath: string): string {
  const normalized = filePath.replaceAll("\\", "/");
  const marker = "/public/";
  const index = normalized.lastIndexOf(marker);
  if (index < 0) throw new Error(`Image destination must be inside public/: ${filePath}`);
  return `/${normalized.slice(index + marker.length)}`;
}

async function download(url: string): Promise<Buffer> {
  const key = createHash("sha256").update(url).digest("hex");
  const existing = downloads.get(key);
  if (existing) return existing;

  const pending = (async () => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: sourceRequestHeaders(),
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} for image ${url}`);
        return Buffer.from(await response.arrayBuffer());
      } catch (error) {
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
    // This map deduplicates only concurrent requests. Retaining resolved promises
    // would retain every source Buffer until the full import process exits.
    if (downloads.get(key) === pending) downloads.delete(key);
  }
}

/** Clears only the in-flight network download memo; exported for isolated import tests. */
export function resetImageDownloadCache(): void {
  downloads.clear();
}

export async function cacheImage(
  url: string,
  destinationBase: string,
  options: CacheImageOptions = {},
): Promise<ImageAsset> {
  const source = await download(url);
  const metadata = await sharp(source).rotate().metadata();
  if (!metadata.width) throw new Error(`Image has no readable width: ${url}`);
  await mkdir(dirname(destinationBase), { recursive: true });

  const widths = PROFILE_WIDTHS[options.profile ?? "ordinary"]
    .filter((width) => width <= metadata.width!);
  const variants: ImageVariant[] = [];
  if (widths.length === 0) {
    const fallbackPath = `${destinationBase}.webp`;
    await sharp(source).rotate().webp({ quality: 82 }).toFile(fallbackPath);
    return { src: publicUrl(fallbackPath), variants };
  }

  for (const width of widths) {
    const avifPath = `${destinationBase}-${width}.avif`;
    const webpPath = `${destinationBase}-${width}.webp`;
    await Promise.all([
      sharp(source).rotate().resize({ width, withoutEnlargement: true }).avif({ quality: 58 }).toFile(avifPath),
      sharp(source).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(webpPath),
    ]);
    variants.push(
      { url: publicUrl(avifPath), width, format: "avif" },
      { url: publicUrl(webpPath), width, format: "webp" },
    );
  }

  const largestWidth = widths.at(-1)!;
  return { src: publicUrl(`${destinationBase}-${largestWidth}.webp`), variants };
}
