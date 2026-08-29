import { describe, expect, it } from "vitest";
import { getPublicationSite, transformIndexForPublication } from "./publication-config";

const privateIndex = '<meta name="robots" content="noindex, nofollow" /><title>Private demo</title>';

describe("publication configuration", () => {
  it.each([undefined, "", "http://demo.example", "not a URL", "https://user:pass@demo.example"])(
    "keeps the page private for an absent or invalid operator URL: %s",
    (siteUrl) => {
      expect(getPublicationSite(siteUrl)).toBeUndefined();
      expect(transformIndexForPublication(privateIndex, siteUrl)).toBe(privateIndex);
    },
  );

  it("changes the rendered index directive only for an explicit valid HTTPS URL", () => {
    expect(getPublicationSite("https://demo.example/proposal/")?.href).toBe(
      "https://demo.example/proposal/",
    );
    expect(transformIndexForPublication(privateIndex, "https://demo.example/proposal/")).toBe(
      '<meta name="robots" content="index, follow" /><title>Private demo</title>',
    );
  });
});
