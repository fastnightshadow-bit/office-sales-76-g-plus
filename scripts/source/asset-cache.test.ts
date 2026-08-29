import { access, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cacheImage, resetImageDownloadCache } from "./asset-cache";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  resetImageDownloadCache();
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, {
    recursive: true,
    force: true,
  })));
});

describe("cacheImage", () => {
  it("writes only non-enlarged AVIF and WebP variants and returns local public URLs", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-76-assets-"));
    temporaryDirectories.push(root);
    const publicRoot = join(root, "public");
    const source = await sharp({
      create: { width: 1_000, height: 600, channels: 3, background: "#718277" },
    }).png().toBuffer();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(new Uint8Array(source), {
      status: 200,
      headers: { "content-type": "image/png" },
    }));

    const asset = await cacheImage(
      "https://example.test/media/cover.png",
      join(publicRoot, "media/projects/primer/cover"),
    );

    expect(asset).toEqual({
      src: "/media/projects/primer/cover-960.webp",
      variants: [
        { url: "/media/projects/primer/cover-480.avif", width: 480, format: "avif" },
        { url: "/media/projects/primer/cover-480.webp", width: 480, format: "webp" },
        { url: "/media/projects/primer/cover-960.avif", width: 960, format: "avif" },
        { url: "/media/projects/primer/cover-960.webp", width: 960, format: "webp" },
      ],
    });
    await expect(access(join(publicRoot, "media/projects/primer/cover-960.webp"))).resolves.toBeUndefined();
    expect((await readFile(join(publicRoot, "media/projects/primer/cover-480.avif"))).length).toBeGreaterThan(0);
  });

  it("downloads a repeated URL once while allowing distinct local destinations", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-76-assets-"));
    temporaryDirectories.push(root);
    const source = await sharp({
      create: { width: 500, height: 300, channels: 3, background: "#17221d" },
    }).png().toBuffer();
    let downloads = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      downloads += 1;
      return new Response(new Uint8Array(source), { status: 200 });
    });

    await Promise.all([
      cacheImage("https://example.test/shared.png", join(root, "public/media/a/shared")),
      cacheImage("https://example.test/shared.png", join(root, "public/media/b/shared")),
    ]);

    expect(downloads).toBe(1);
    await expect(access(join(root, "public/media/a/shared-480.webp"))).resolves.toBeUndefined();
    await expect(access(join(root, "public/media/b/shared-480.webp"))).resolves.toBeUndefined();
    expect(await readdir(root)).toEqual(["public"]);
  });

  it("releases a resolved source buffer instead of retaining every image for the whole import", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-76-assets-"));
    temporaryDirectories.push(root);
    const source = await sharp({
      create: { width: 500, height: 300, channels: 3, background: "#17221d" },
    }).png().toBuffer();
    let downloads = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      downloads += 1;
      return new Response(new Uint8Array(source), { status: 200 });
    });

    await cacheImage("https://example.test/sequential.png", join(root, "public/media/a/image"));
    await cacheImage("https://example.test/sequential.png", join(root, "public/media/b/image"));

    expect(downloads).toBe(2);
  });

  it("uses compact ordinary, cover, and hero width profiles", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-76-assets-"));
    temporaryDirectories.push(root);
    const source = await sharp({
      create: { width: 2_000, height: 1_200, channels: 3, background: "#718277" },
    }).png().toBuffer();
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => (
      new Response(new Uint8Array(source), { status: 200 })
    ));

    const ordinary = await cacheImage(
      "https://example.test/ordinary.png",
      join(root, "public/media/ordinary/image"),
    );
    const cover = await cacheImage(
      "https://example.test/cover.png",
      join(root, "public/media/cover/image"),
      { profile: "cover" },
    );
    const hero = await cacheImage(
      "https://example.test/hero.png",
      join(root, "public/media/hero/image"),
      { profile: "hero" },
    );

    expect([...new Set(ordinary.variants.map(({ width }) => width))]).toEqual([480, 960]);
    expect([...new Set(cover.variants.map(({ width }) => width))]).toEqual([480, 960, 1440]);
    expect([...new Set(hero.variants.map(({ width }) => width))]).toEqual([480, 960, 1440, 1920]);
  });

  it("retries a transient image download before reporting failure", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-76-assets-"));
    temporaryDirectories.push(root);
    const source = await sharp({
      create: { width: 500, height: 300, channels: 3, background: "#f4f6f3" },
    }).png().toBuffer();
    let downloads = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      downloads += 1;
      if (downloads === 1) throw new TypeError("temporary network failure");
      return new Response(new Uint8Array(source), { status: 200 });
    });

    const asset = await cacheImage(
      "https://example.test/retry.png",
      join(root, "public/media/retry/image"),
    );

    expect(asset).toMatchObject({ src: "/media/retry/image-480.webp" });
    expect(downloads).toBe(2);
  });
});
