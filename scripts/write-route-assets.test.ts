import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeRouteAssets } from "./write-route-assets";

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

describe("route asset generator", () => {
  it("writes escaped XML for home, catalog, and every supplied project route", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "office-sales-public-"));

    const result = await writeRouteAssets({
      outputDir,
      siteUrl: "https://demo.example/private&review/",
      slugs: ["alpha", "river&park", "third-project"],
    });

    const sitemap = await readFile(join(outputDir, "sitemap.xml"), "utf8");
    expect(result.generated).toBe(true);
    expect(sitemap).toContain("<loc>https://demo.example/private&amp;review/</loc>");
    expect(sitemap).toContain("<loc>https://demo.example/private&amp;review/catalog</loc>");
    expect(sitemap).toContain("<loc>https://demo.example/private&amp;review/catalog/alpha</loc>");
    expect(sitemap).toContain("<loc>https://demo.example/private&amp;review/catalog/river%26park</loc>");
    expect(sitemap).toContain("<loc>https://demo.example/private&amp;review/catalog/third-project</loc>");
    expect(sitemap.match(/<url>/g)).toHaveLength(5);
  });

  it("keeps private robots and skips a sitemap when no URL was approved", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "office-sales-private-"));

    const result = await writeRouteAssets({ outputDir, slugs: ["alpha", "beta", "gamma"] });

    expect(result).toEqual({
      generated: false,
      message: "VITE_SITE_URL is not set; public route assets skipped.",
    });
    expect(await readFile(join(outputDir, "robots.txt"), "utf8")).toBe("User-agent: *\nDisallow: /\n");
    expect(await exists(join(outputDir, "sitemap.xml"))).toBe(false);
  });

  it("rejects non-HTTPS publication URLs without generating a sitemap", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "office-sales-invalid-"));

    const result = await writeRouteAssets({
      outputDir,
      siteUrl: "http://demo.example",
      slugs: ["alpha", "beta", "gamma"],
    });

    expect(result.generated).toBe(false);
    expect(await exists(join(outputDir, "sitemap.xml"))).toBe(false);
  });
});
