import * as cheerio from "cheerio";
import {
  companyDataSchema,
  legalDocumentSchema,
  type CompanyData,
  type LegalDocument,
} from "../../src/features/company/company.types";

function clean(value: string | undefined): string | undefined {
  const normalized = value?.replace(/[\u00a0\u202f\s]+/g, " ").trim();
  return normalized || undefined;
}

function required(value: string | undefined, field: string): string {
  if (!value) throw new Error(`Missing company field: ${field}`);
  return value;
}

function adjacentValue($: cheerio.CheerioAPI, label: RegExp): string | undefined {
  let value: string | undefined;
  $("h2, h3, h4, b, strong").each((_index, node) => {
    if (value || !label.test(clean($(node).text()) ?? "")) return;
    value = clean($(node).nextAll("p, div, span").first().text())
      ?? clean($(node).parent().children().not(node).text());
  });
  return value;
}

function normalizedDirector(value: string): string {
  const names = value.split(" ").filter(Boolean);
  if (names.length === 3 && /^Рыжков$/i.test(names[0] ?? "")) {
    return `${names[1]} ${names[2]} ${names[0]}`;
  }
  return value;
}

function phoneByDigits($: cheerio.CheerioAPI, wanted: string): string | undefined {
  let result: string | undefined;
  $("a[href^='tel:']").each((_index, anchor) => {
    const digits = ($(anchor).attr("href") ?? "").replace(/\D/g, "");
    if (!result && digits.endsWith(wanted)) result = clean($(anchor).text());
  });
  return result;
}

function linkByOrigin($: cheerio.CheerioAPI, origin: string): string | undefined {
  return $("a[href]").toArray().map((anchor) => $(anchor).attr("href"))
    .find((href) => href?.startsWith(origin));
}

function companyAddress(catalogText: string): string | undefined {
  const compact = clean(catalogText)?.replace(/\\/g, "/");
  if (!compact || !/Победы/i.test(compact)) return undefined;
  const match = compact.match(/(?:г\.\s*)?Ярославль,?\s*ул\.\s*Победы\s*д\.?\s*(\d+\/\d+)\s*оф\.?\s*(\d+)/i);
  return match ? `Ярославль, ул. Победы, д. ${match[1]}, офис ${match[2]}` : undefined;
}

export interface ParseCompanyInput {
  aboutHtml: string;
  catalogHtml: string;
  checkedAt: string;
}

export function parseCompany({ aboutHtml, catalogHtml, checkedAt }: ParseCompanyInput): CompanyData {
  const $ = cheerio.load(aboutHtml);
  $("script, style, noscript, template").remove();
  const catalog = cheerio.load(catalogHtml);
  catalog("script, style, noscript, template").remove();
  const catalogText = [
    catalog.root().text(),
    ...catalog("[data-preview]").toArray().map((node) => catalog(node).attr("data-preview") ?? ""),
  ].join(" ");
  if (!/ООО\s+«Ваш выбор»/i.test(catalogText) || !/7602067446/.test(catalogText)) {
    throw new Error("Source does not confirm ООО «Ваш выбор», ИНН 7602067446");
  }

  const director = normalizedDirector(required(adjacentValue($, /^директор\s+компании$/i), "director"));
  const address = required(companyAddress(catalogText), "address");
  const email = $("a[href^='mailto:']").first().attr("href")?.replace(/^mailto:/i, "");
  return companyDataSchema.parse({
    brand: "Офис продаж 76",
    legalName: "ООО «Ваш выбор»",
    inn: "7602067446",
    director,
    address,
    cityPhone: required(phoneByDigits($, "4852955555"), "cityPhone"),
    mobilePhone: required(phoneByDigits($, "9109773737"), "mobilePhone"),
    email: required(clean(email), "email"),
    telegramUrl: required(linkByOrigin($, "https://t.me/"), "telegramUrl"),
    maxUrl: required(linkByOrigin($, "https://max.ru/"), "maxUrl"),
    sourceCheckedAt: checkedAt,
  });
}

export function parseLegalDocument(
  html: string,
  kind: LegalDocument["kind"],
  sourceUrl: string,
  checkedAt: string,
): LegalDocument {
  const $ = cheerio.load(html);
  $("script, style, noscript, template").remove();
  const title = clean($(".policy-title, .policy-content h1, main h1").first().text());
  const text = $(".policy-text").first().clone();
  text.find("br").replaceWith("\n");
  const paragraphs = text.text().split(/\n+/).map(clean)
    .filter((paragraph): paragraph is string => Boolean(paragraph));
  return legalDocumentSchema.parse({
    kind,
    title,
    paragraphs,
    sourceUrl,
    sourceCheckedAt: checkedAt,
    requiresLegalReview: true,
  });
}
