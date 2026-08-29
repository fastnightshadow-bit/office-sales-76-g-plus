const USER_AGENT = "OfficeSales76PrivateDemo/1.0";

export async function fetchPage(url: string, attempts = 3): Promise<string> {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError("attempts must be a positive integer");
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }
  throw lastError;
}

export function sourceRequestHeaders(): Readonly<Record<string, string>> {
  return { "user-agent": USER_AGENT };
}

export async function fetchPageCached(url: string, cacheDirectory: string): Promise<string> {
  const key = createHash("sha256").update(url).digest("hex");
  const cachePath = join(cacheDirectory, `${key}.html`);
  try {
    return await readFile(cachePath, "utf8");
  } catch {
    // A cache miss is expected on the first import.
  }
  const html = await fetchPage(url);
  await mkdir(cacheDirectory, { recursive: true });
  const temporaryPath = `${cachePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, html, "utf8");
  await rename(temporaryPath, cachePath);
  return html;
}
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
