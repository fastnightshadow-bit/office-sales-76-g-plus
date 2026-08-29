import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import projects from "../src/data/projects.json";

const privateRobots = "User-agent: *\nDisallow: /\n";

export interface WriteRouteAssetsOptions {
  outputDir: string;
  siteUrl?: string;
  slugs: readonly string[];
}

export type WriteRouteAssetsResult =
  | { generated: true; message: string }
  | { generated: false; message: string };

function normalizeSiteUrl(siteUrl: string | undefined): URL | undefined {
  if (!siteUrl) return undefined;
  try {
    const parsed = new URL(siteUrl);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) return undefined;
    parsed.pathname = `${parsed.pathname.replace(/\/+$/, "")}/`;
    return parsed;
  } catch {
    return undefined;
  }
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function routeUrl(base: URL, path: string): string {
  const next = new URL(base.href);
  next.pathname = `${base.pathname.replace(/\/+$/, "")}${path}` || "/";
  return next.href;
}

function sitemapXml(base: URL, slugs: readonly string[]): string {
  const paths = ["/", "/catalog", ...slugs.map((slug) => `/catalog/${encodeURIComponent(slug)}`)];
  const urls = paths.map((path) => `  <url><loc>${escapeXml(routeUrl(base, path))}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export async function writeRouteAssets(options: WriteRouteAssetsOptions): Promise<WriteRouteAssetsResult> {
  await mkdir(options.outputDir, { recursive: true });
  const robotsPath = join(options.outputDir, "robots.txt");
  const sitemapPath = join(options.outputDir, "sitemap.xml");
  const siteUrl = normalizeSiteUrl(options.siteUrl);

  if (!siteUrl) {
    await writeFile(robotsPath, privateRobots, "utf8");
    await rm(sitemapPath, { force: true });
    return {
      generated: false,
      message: options.siteUrl
        ? "VITE_SITE_URL must be a valid HTTPS URL; public route assets skipped."
        : "VITE_SITE_URL is not set; public route assets skipped.",
    };
  }

  await writeFile(sitemapPath, sitemapXml(siteUrl, options.slugs), "utf8");
  await writeFile(
    robotsPath,
    `User-agent: *\nAllow: /\nSitemap: ${routeUrl(siteUrl, "/sitemap.xml")}\n`,
    "utf8",
  );
  return { generated: true, message: `Public route assets generated for ${siteUrl.href}` };
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : "";
if (currentFile === invokedFile || pathToFileURL(invokedFile).href === import.meta.url) {
  const outputDir = resolve(dirname(currentFile), "../public");
  const slugs = (projects as Array<{ slug: string }>).map(({ slug }) => slug);
  const result = await writeRouteAssets({
    outputDir,
    ...(process.env.VITE_SITE_URL ? { siteUrl: process.env.VITE_SITE_URL } : {}),
    slugs,
  });
  console.log(result.message);
}
