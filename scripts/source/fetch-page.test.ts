import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPage, fetchPageCached } from "./fetch-page";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, {
    recursive: true,
    force: true,
  })));
});

describe("fetchPage", () => {
  it("retries a transient failure and returns the successful body", async () => {
    vi.useFakeTimers();
    let attempts = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      attempts += 1;
      if (attempts === 1) throw new TypeError("temporary network failure");
      return new Response("<main>ok</main>", { status: 200 });
    });

    const pending = fetchPage("https://example.test/catalog/", 2);
    await vi.advanceTimersByTimeAsync(500);

    await expect(pending).resolves.toBe("<main>ok</main>");
    expect(attempts).toBe(2);
  });

  it("rejects a non-success response after the requested attempt", async () => {
    let attempts = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      attempts += 1;
      return new Response("unavailable", { status: 503 });
    });

    await expect(fetchPage("https://example.test/catalog/", 1))
      .rejects.toThrow("HTTP 503 for https://example.test/catalog/");
    expect(attempts).toBe(1);
  });

  it("reuses a completed local page cache on later imports", async () => {
    const cacheDirectory = await mkdtemp(join(tmpdir(), "office-sales-76-pages-"));
    temporaryDirectories.push(cacheDirectory);
    let requests = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      requests += 1;
      return new Response("<main>cached</main>", { status: 200 });
    });

    expect(await fetchPageCached("https://example.test/page/", cacheDirectory))
      .toBe("<main>cached</main>");
    expect(await fetchPageCached("https://example.test/page/", cacheDirectory))
      .toBe("<main>cached</main>");
    expect(requests).toBe(1);
  });
});
