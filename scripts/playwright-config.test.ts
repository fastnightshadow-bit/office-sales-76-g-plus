import { describe, expect, it } from "vitest";
import { getPlaywrightPort } from "../playwright.config";

describe("getPlaywrightPort", () => {
  it("uses an isolated explicit port and keeps 4173 as the default", () => {
    expect(getPlaywrightPort({})).toBe(4173);
    expect(getPlaywrightPort({ PLAYWRIGHT_PORT: "4187" })).toBe(4187);
    expect(() => getPlaywrightPort({ PLAYWRIGHT_PORT: "invalid" })).toThrow(/PLAYWRIGHT_PORT/);
  });
});
