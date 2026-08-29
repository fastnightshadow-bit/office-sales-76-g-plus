import * as cheerio from "cheerio";

export interface ProjectIndexEntry {
  sourceUrl: string;
  title?: string;
  shortDescription?: string;
  district?: string;
  completionLabel?: string;
  minimumPriceLabel?: string;
  coverImageUrl?: string;
}

const DISTRICT_NAMES: Record<string, string> = {
  dzerzhinskij: "Дзержинский",
  frunzenskij: "Фрунзенский",
  krasnoperekopskij: "Красноперекопский",
  leninskij: "Центр",
  zavolzhskij: "Заволжский",
};

function clean(value: string | undefined): string | undefined {
  const normalized = value?.replace(/[\u00a0\u202f\s]+/g, " ").trim();
  return normalized || undefined;
}

function absoluteUrl(value: string | undefined, baseUrl: string): string | undefined {
  if (!value) return undefined;
  try {
    const resolved = new URL(value, baseUrl);
    const base = new URL(baseUrl);
    if (
      !["http:", "https:"].includes(resolved.protocol)
      || resolved.hostname !== base.hostname
      || (resolved.port && !(
        (resolved.protocol === "https:" && resolved.port === "443")
        || (resolved.protocol === "http:" && resolved.port === "80")
      ))
    ) return undefined;
    const writtenOrigin = baseUrl.match(/^https?:\/\/[^/]+/i)?.[0];
    return resolved.origin === base.origin && writtenOrigin
      ? `${writtenOrigin}${resolved.pathname}${resolved.search}${resolved.hash}`
      : resolved.href;
  } catch {
    return undefined;
  }
}

function canonicalProjectUrl(value: string | undefined, baseUrl: string): string | undefined {
  const absolute = absoluteUrl(value, baseUrl);
  if (!absolute) return undefined;

  const candidate = new URL(absolute);
  const source = new URL(baseUrl);
  if (candidate.origin !== source.origin || !/^\/catalog\/[^/]+\/$/.test(candidate.pathname)) {
    return undefined;
  }
  candidate.hash = "";
  candidate.search = "";
  const writtenOrigin = baseUrl.match(/^https?:\/\/[^/]+/i)?.[0] ?? candidate.origin;
  return `${writtenOrigin}${candidate.pathname}`;
}

/** Extracts the inventory plus explicit card fields without deriving one field from another. */
export function parseProjectIndexEntries(html: string, baseUrl: string): ProjectIndexEntry[] {
  const $ = cheerio.load(html);
  $("script, style, noscript, template").remove();
  const entries = new Map<string, ProjectIndexEntry>();

  $("a[href]").each((_index, anchor) => {
    const link = $(anchor);
    const sourceUrl = canonicalProjectUrl(link.attr("href"), baseUrl);
    if (!sourceUrl || entries.has(sourceUrl)) return;

    const card = link.find(".property-card").first();
    const completion = clean(card.find(".property-tag").first().text())
      ?.replace(/^срок\s+сдачи\s*:\s*/i, "");
    const districtCode = clean(link.attr("data-district"));
    const coverImageUrl = absoluteUrl(card.find(".property-image img").first().attr("src"), baseUrl);
    const entry: ProjectIndexEntry = { sourceUrl };
    const title = clean(card.find(".property-title").first().text()) ?? clean(link.text());
    const shortDescription = clean(card.find(".property-desc").first().text());
    const minimumPriceLabel = clean(card.find(".property-price").first().text());
    const district = districtCode ? DISTRICT_NAMES[districtCode] : undefined;
    if (title) entry.title = title;
    if (shortDescription) entry.shortDescription = shortDescription;
    if (district) entry.district = district;
    if (completion) entry.completionLabel = completion;
    if (minimumPriceLabel) entry.minimumPriceLabel = minimumPriceLabel;
    if (coverImageUrl) entry.coverImageUrl = coverImageUrl;
    entries.set(sourceUrl, entry);
  });

  return [...entries.values()];
}

export function parseProjectIndex(html: string, baseUrl: string): string[] {
  return parseProjectIndexEntries(html, baseUrl).map(({ sourceUrl }) => sourceUrl);
}
