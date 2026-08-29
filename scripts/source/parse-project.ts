import * as cheerio from "cheerio";
import type { Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";
import type {
  ProjectDocument,
  RoomKey,
  SourceLayoutInput,
  SourceProjectInput,
} from "../../src/features/catalog/catalog.types";

function clean(value: string | undefined): string | undefined {
  const normalized = value?.replace(/[\u00a0\u202f\s]+/g, " ").trim();
  return normalized || undefined;
}

function absoluteUrl(value: string | undefined, sourceUrl: string): string | undefined {
  if (!value || /^(?:data:|javascript:|mailto:|tel:)/i.test(value)) return undefined;
  try {
    const resolved = new URL(value, sourceUrl);
    const source = new URL(sourceUrl);
    if (
      !["http:", "https:"].includes(resolved.protocol)
      || resolved.hostname !== source.hostname
      || (resolved.port && !(
        (resolved.protocol === "https:" && resolved.port === "443")
        || (resolved.protocol === "http:" && resolved.port === "80")
      ))
    ) return undefined;
    const writtenOrigin = sourceUrl.match(/^https?:\/\/[^/]+/i)?.[0];
    return resolved.origin === source.origin && writtenOrigin
      ? `${writtenOrigin}${resolved.pathname}${resolved.search}${resolved.hash}`
      : resolved.href;
  } catch {
    return undefined;
  }
}

function backgroundUrl(style: string | undefined): string | undefined {
  return style?.match(/background-image\s*:\s*url\((?:["']?)(.*?)(?:["']?)\)/i)?.[1];
}

function roomKey(label: string | undefined): RoomKey | undefined {
  if (!label) return undefined;
  if (/студ/i.test(label)) return "studio";
  if (/(?:^|\D)1(?:\s*[-–—]?\s*(?:к|комн))|однокомн/i.test(label)) return "1";
  if (/(?:^|\D)2(?:\s*[-–—]?\s*(?:к|комн))|двухкомн/i.test(label)) return "2";
  if (/(?:^|\D)3(?:\s*[-–—]?\s*(?:к|комн))|тр[её]хкомн/i.test(label)) return "3";
  if (/(?:^|\D)4(?:\s*\+|\s*[-–—]?\s*(?:к|комн))|многокомн/i.test(label)) return "4+";
  return undefined;
}

function labelledValue($: cheerio.CheerioAPI, root: Cheerio<AnyNode>, labelPattern: RegExp): string | undefined {
  let result: string | undefined;
  root.find("h2, h3, h4, b, strong, small, .lp-prop7-n").each((_index, node) => {
    if (result || !labelPattern.test(clean($(node).text()) ?? "")) return;
    const label = $(node);
    const parent = label.parent();
    const sibling = label.nextAll("p, span, div").first();
    result = clean(sibling.text()) ?? clean(parent.children().not(label).text());
  });
  return result;
}

function developerValue($: cheerio.CheerioAPI): string | undefined {
  let result: string | undefined;
  $("[aria-label='Об объекте'] > div, [data-project-fact], .lp-prop7").each((_index, rowNode) => {
    if (result) return;
    const row = $(rowNode);
    const label = row.find("h2, h3, h4, b, strong, small, .lp-prop7-n").first();
    if (!/^застройщик$/i.test(clean(label.text()) ?? "")) return;
    const value = clean(row.find(".lp-prop7-v").first().text())
      ?? clean(label.next("p, span, div").first().text());
    if (!value || value.length > 160 || !/[a-zа-яё]/i.test(value) || /^инн\b/i.test(value)) return;
    result = value;
  });
  return result;
}

function descriptionParagraphs($: cheerio.CheerioAPI): string[] {
  const source = $(".lp-description, [aria-label='Об объекте']").first();
  const isGenericFactsSection = source.is("[aria-label='Об объекте']");
  const description = source.clone();
  if (!description.length) return [];
  if (isGenericFactsSection) description.find("h3").parent().remove();
  description.find("script, style, noscript, template, h1, h2, h3").remove();
  description.find("br").replaceWith("\n");
  return [...new Set(description.text().split(/\n+/).map(clean).filter((item): item is string => Boolean(item)))];
}

function extractDocuments($: cheerio.CheerioAPI, sourceUrl: string): ProjectDocument[] {
  const result = new Map<string, ProjectDocument>();
  $(".project-documents a[href], .file-slider a[href], .element-lp a[href$='.pdf'], .element-lp a[href*='.pdf?']")
    .each((_index, anchor) => {
      const link = $(anchor);
      const url = absoluteUrl(link.attr("href"), sourceUrl);
      if (!url || result.has(url)) return;
      const title = clean(link.find(".file-slide-item-name").text())
        ?? clean(link.text())
        ?? "Документ проекта";
      result.set(url, { title, url, status: "unverified" });
    });
  return [...result.values()];
}

function extractGallery($: cheerio.CheerioAPI, sourceUrl: string): string[] {
  const result = new Set<string>();
  $(".project-gallery img, .photo-slide-image").each((_index, element) => {
    const item = $(element);
    const raw = item.attr("href") ?? item.attr("data-src") ?? item.attr("src")
      ?? backgroundUrl(item.attr("style"));
    const url = absoluteUrl(raw, sourceUrl);
    if (url) result.add(url);
  });
  return [...result];
}

function extractLayouts($: cheerio.CheerioAPI, sourceUrl: string): SourceLayoutInput[] {
  const cards = $("[data-layout-card], .layout-card, .lp-plan-container");
  return cards.toArray().map((element, index) => {
    const card = $(element);
    const visibleName = clean(card.find(".lp-plan-name:not(.visible-xs), .lp-plan-name, .num_float, h3").first().text());
    const id = clean(card.attr("data-id-plan")) ?? clean(card.attr("data-layout-id")) ?? `layout-${index + 1}`;
    const rawImage = card.find(".lp-plan-flat, img").first().attr("href")
      ?? card.find("img").first().attr("data-src")
      ?? card.find("img").first().attr("src")
      ?? backgroundUrl(card.find(".lp-plan-flat").first().attr("style"));
    const imageUrl = absoluteUrl(rawImage, sourceUrl);
    const priceLabel = labelledValue($, card, /^(?:цена|стоимость)$/i);
    const pricePerMeterLabel = labelledValue($, card, /цена\s+за\s+(?:1\s*)?м|цена\s+за\s*м²/i);
    const areaLabel = labelledValue($, card, /^площадь$/i);
    const floors = labelledValue($, card, /^этаж(?:и)?$/i);
    const entrances = labelledValue($, card, /^подъезд(?:ы)?$/i);
    const notes = card.find("p").toArray().map((node) => clean($(node).text()))
      .filter((item): item is string => Boolean(item));
    const layout: SourceLayoutInput = { id };
    if (visibleName) layout.roomLabel = visibleName;
    if (areaLabel) layout.areaLabel = areaLabel;
    if (priceLabel) layout.priceLabel = priceLabel;
    if (pricePerMeterLabel) layout.pricePerMeterLabel = pricePerMeterLabel;
    if (floors) layout.floors = floors;
    if (entrances) layout.entrances = entrances;
    if (notes.length) layout.notes = notes;
    if (imageUrl) layout.imageUrl = imageUrl;
    return layout;
  });
}

function sourceSlug(sourceUrl: string): string {
  const pathname = new URL(sourceUrl).pathname;
  const raw = decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? "");
  return raw.trim().replace(/\s+/g, "-");
}

/** Parses only explicit source values; provenance is carried once by the parent Project input. */
export function parseProjectPage(html: string, sourceUrl: string, checkedAt: string): SourceProjectInput {
  const $ = cheerio.load(html);
  $("script, style, noscript, template").remove();
  const root = $("main, .element-lp, body").first();
  const title = clean($(".lp-name, h1").first().text());
  if (!title) throw new Error(`Missing project title for ${sourceUrl}`);

  const input: SourceProjectInput = {
    slug: sourceSlug(sourceUrl),
    title,
    sourceUrl,
    sourceCheckedAt: checkedAt,
  };
  const shortDescription = clean($(".lp-small-decription, .project-intro").first().text());
  const description = descriptionParagraphs($);
  const completionLabel = labelledValue($, root, /^срок\s+сдачи$/i);
  const address = labelledValue($, root, /^адрес$/i)
    ?? clean(html.match(/hintContent:\s*['"]([^'"]+)['"]/)?.[1]);
  const district = labelledValue($, root, /^район$/i);
  const developer = developerValue($);
  const mortgageRateLabel = labelledValue($, root, /^ипотека/i);
  const minimumPriceLabel = labelledValue($, root, /^минимальная\s+цена$/i);
  const coverImageUrl = absoluteUrl(
    backgroundUrl($(".first-image").first().attr("style"))
      ?? $(".first-image img, .project-gallery img").first().attr("src"),
    sourceUrl,
  );
  const roomPriceLabels: Partial<Record<RoomKey, string>> = {};
  $(".lp-prices, [aria-label='Стоимость квартир'] > div").each((_index, row) => {
    const item = $(row);
    const label = clean(item.find(".lp-prices-n, h3, h4, b, strong").first().text());
    const room = roomKey(label);
    const value = clean(item.find(".lp-prices-v, p, span").first().text());
    if (room && value) roomPriceLabels[room] = value;
  });
  const galleryUrls = extractGallery($, sourceUrl);
  const documents = extractDocuments($, sourceUrl);
  const layouts = extractLayouts($, sourceUrl);
  const relatedProjectSlugs = $(".related-projects a[href], .recommendations a[href]").toArray()
    .flatMap((anchor) => {
      const url = absoluteUrl($(anchor).attr("href"), sourceUrl);
      return url && /^\/catalog\/[^/]+\/$/.test(new URL(url).pathname) ? [sourceSlug(url)] : [];
    });

  if (shortDescription) input.shortDescription = shortDescription;
  if (description.length) input.description = description;
  if (completionLabel) input.completionLabel = completionLabel;
  if (address) input.address = address;
  if (district) input.district = district;
  if (developer) input.developer = developer;
  if (mortgageRateLabel) input.mortgageRateLabel = mortgageRateLabel;
  if (minimumPriceLabel) input.minimumPriceLabel = minimumPriceLabel;
  if (coverImageUrl) input.coverImageUrl = coverImageUrl;
  if (Object.keys(roomPriceLabels).length) input.roomPriceLabels = roomPriceLabels;
  if (galleryUrls.length) input.galleryUrls = galleryUrls;
  if (documents.length) input.documents = documents;
  if (layouts.length) input.layouts = layouts;
  if (relatedProjectSlugs.length) input.relatedProjectSlugs = [...new Set(relatedProjectSlugs)];
  return input;
}
