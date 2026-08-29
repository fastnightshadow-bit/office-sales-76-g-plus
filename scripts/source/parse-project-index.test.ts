import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseProjectIndex } from "./parse-project-index";

const catalogHtml = readFileSync(
  resolve(process.cwd(), "src/test/fixtures/source-catalog.html"),
  "utf8",
);

describe("parseProjectIndex", () => {
  it("returns unique absolute project URLs only", () => {
    const links = parseProjectIndex(catalogHtml, "https://офиспродаж76.рф");
    expect(links).toEqual([
      "https://офиспродаж76.рф/catalog/zhk-novatsiya/",
      "https://офиспродаж76.рф/catalog/zhk-yaroslavl-siti-1-ztap/",
    ]);
  });
});
