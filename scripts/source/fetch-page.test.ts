import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPage, validateSourceUrl } from "./fetch-page";

const SOURCE_URL = "https://офиспродаж76.рф/catalog/primer/";
const SOURCE_HOSTNAME = new URL(SOURCE_URL).hostname;
const publicNetwork = {
  allowedHostnames: [SOURCE_HOSTNAME],
  resolveHost: async () => ["93.184.216.34"],
};

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
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

    const pending = fetchPage(SOURCE_URL, 2, publicNetwork);
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

    await expect(fetchPage(SOURCE_URL, 1, publicNetwork))
      .rejects.toThrow(`HTTP 503 for ${SOURCE_URL}`);
    expect(attempts).toBe(1);
  });

  it("fetches every normal page request fresh", async () => {
    let requests = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      requests += 1;
      return new Response(`<main>${requests}</main>`, { status: 200 });
    });

    expect(await fetchPage(SOURCE_URL, 1, publicNetwork)).toBe("<main>1</main>");
    expect(await fetchPage(SOURCE_URL, 1, publicNetwork)).toBe("<main>2</main>");
    expect(requests).toBe(2);
  });

  it("treats unicode and punycode source hostnames as the same allowlisted host", () => {
    expect(validateSourceUrl(SOURCE_URL, [SOURCE_HOSTNAME]).hostname).toBe(SOURCE_HOSTNAME);
    expect(validateSourceUrl(
      `https://${SOURCE_HOSTNAME}/catalog/primer/`,
      ["офиспродаж76.рф"],
    ).hostname).toBe(SOURCE_HOSTNAME);
  });

  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "169.254.10.20",
    "224.0.0.1",
    "0.0.0.0",
    "::1",
    "::127.0.0.1",
    "::ffff:127.0.0.1",
    "fe80::1",
    "ff02::1",
    "::",
  ])("rejects a source hostname resolving to unsafe address %s", async (address) => {
    const request = vi.fn<typeof fetch>();
    await expect(fetchPage(SOURCE_URL, 1, {
      ...publicNetwork,
      fetchImpl: request,
      resolveHost: async () => [address],
    })).rejects.toThrow("unsafe address");
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects a direct URL outside the explicit source host", async () => {
    await expect(fetchPage("https://example.test/catalog/", 1, publicNetwork))
      .rejects.toThrow("Source host is not allowlisted");
  });

  it("validates redirect targets before following them", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, {
      status: 302,
      headers: { location: "http://127.0.0.1/private" },
    }));

    await expect(fetchPage(SOURCE_URL, 1, publicNetwork))
      .rejects.toThrow("Source host is not allowlisted");
  });

  it("re-resolves and rejects a same-host redirect that changes to a private address", async () => {
    const addresses = [["93.184.216.34"], ["127.0.0.1"]];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, {
      status: 302,
      headers: { location: "/redirected" },
    }));

    await expect(fetchPage(SOURCE_URL, 1, {
      ...publicNetwork,
      resolveHost: async () => addresses.shift() ?? ["127.0.0.1"],
    })).rejects.toThrow("unsafe address");
  });
});
