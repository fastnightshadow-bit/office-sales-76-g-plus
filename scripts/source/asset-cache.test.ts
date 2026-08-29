import { access, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cacheImage,
  ContentAssetRegistry,
  GeneratedMediaBudget,
  resetImageDownloadCache,
} from "./asset-cache";

const temporaryDirectories: string[] = [];
const testNetwork = {
  allowedHostnames: ["example.test"],
  resolveHost: async () => ["93.184.216.34"],
};

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
      { network: testNetwork },
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
      cacheImage("https://example.test/shared.png", join(root, "public/media/a/shared"), { network: testNetwork }),
      cacheImage("https://example.test/shared.png", join(root, "public/media/b/shared"), { network: testNetwork }),
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

    await cacheImage("https://example.test/sequential.png", join(root, "public/media/a/image"), { network: testNetwork });
    await cacheImage("https://example.test/sequential.png", join(root, "public/media/b/image"), { network: testNetwork });

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
      { network: testNetwork },
    );
    const cover = await cacheImage(
      "https://example.test/cover.png",
      join(root, "public/media/cover/image"),
      { profile: "cover", network: testNetwork },
    );
    const hero = await cacheImage(
      "https://example.test/hero.png",
      join(root, "public/media/hero/image"),
      { profile: "hero", network: testNetwork },
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
      { network: testNetwork },
    );

    expect(asset).toMatchObject({ src: "/media/retry/image-480.webp" });
    expect(downloads).toBe(2);
  });

  it("rejects an image whose declared Content-Length exceeds the source byte cap", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-76-assets-"));
    temporaryDirectories.push(root);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(new Uint8Array([1]), {
      status: 200,
      headers: { "content-length": "101" },
    }));

    await expect(cacheImage(
      "https://example.test/oversized.jpg",
      join(root, "public/media/oversized/image"),
      { maxSourceBytes: 100, network: testNetwork },
    )).rejects.toThrow("Content-Length: 101");
  });

  it("rejects an image when streamed bytes exceed the source byte cap", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-76-assets-"));
    temporaryDirectories.push(root);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.enqueue(new Uint8Array([4, 5, 6]));
        controller.close();
      },
    }), { status: 200 }));

    await expect(cacheImage(
      "https://example.test/streamed.jpg",
      join(root, "public/media/streamed/image"),
      { maxSourceBytes: 5, network: testNetwork },
    )).rejects.toThrow("exceeds 5 streamed bytes");
  });

  it("reserves generated bytes before writing a file beyond the media budget", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-76-assets-"));
    temporaryDirectories.push(root);
    const source = await sharp({
      create: { width: 500, height: 300, channels: 3, background: "#17221d" },
    }).png().toBuffer();
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => (
      new Response(new Uint8Array(source), { status: 200 })
    ));

    await expect(cacheImage(
      "https://example.test/budget.png",
      join(root, "public/media/budget/image"),
      { mediaBudget: new GeneratedMediaBudget(1), network: testNetwork },
    )).rejects.toThrow("Generated media budget exceeds 1 bytes");
    await expect(access(join(root, "public/media/budget/image-480.avif"))).rejects.toThrow();
  });

  it("reuses one ImageAsset for distinct URLs with identical content", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-76-assets-"));
    temporaryDirectories.push(root);
    const source = await sharp({
      create: { width: 500, height: 300, channels: 3, background: "#718277" },
    }).png().toBuffer();
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => (
      new Response(new Uint8Array(source), { status: 200 })
    ));
    const registry = new ContentAssetRegistry();

    const first = await cacheImage(
      "https://example.test/first.png",
      join(root, "public/media/a/image"),
      { contentRegistry: registry, network: testNetwork },
    );
    const second = await cacheImage(
      "https://example.test/second.png",
      join(root, "public/media/b/image"),
      { contentRegistry: registry, network: testNetwork },
    );

    expect(second).toEqual(first);
    expect(registry.uniqueAssets).toBe(1);
    await expect(access(join(root, "public/media/a/image-480.webp"))).resolves.toBeUndefined();
    await expect(access(join(root, "public/media/b/image-480.webp"))).rejects.toThrow();
  });

  it("deduplicates distinct source byte streams that render to identical image content", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-76-assets-"));
    temporaryDirectories.push(root);
    const source = await sharp({
      create: { width: 500, height: 300, channels: 3, background: "#718277" },
    }).png().toBuffer();
    const sourceWithTrailingMetadata = Buffer.concat([source, Buffer.from("source-metadata")]);
    vi.spyOn(globalThis, "fetch").mockImplementation(async (request) => (
      new Response(new Uint8Array(String(request).includes("second") ? sourceWithTrailingMetadata : source), {
        status: 200,
      })
    ));
    const registry = new ContentAssetRegistry();

    const first = await cacheImage(
      "https://example.test/first.png",
      join(root, "public/media/a/image"),
      { contentRegistry: registry, network: testNetwork },
    );
    const second = await cacheImage(
      "https://example.test/second.png",
      join(root, "public/media/b/image"),
      { contentRegistry: registry, network: testNetwork },
    );

    expect(second).toEqual(first);
    expect(registry.uniqueAssets).toBe(1);
    await expect(access(join(root, "public/media/b/image-480.webp"))).rejects.toThrow();
  });
});
