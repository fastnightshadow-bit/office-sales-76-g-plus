import type {
  DataQualityFlag,
  ImageAsset,
  Layout,
  Project,
  RoomKey,
  RoomPrice,
  SourceLayoutInput,
  SourceProjectInput,
} from "./catalog.types";

const ROOM_KEYS: RoomKey[] = ["studio", "1", "2", "3", "4+"];

const ROOM_LABELS: Array<[RoomKey, RegExp]> = [
  ["studio", /студ|studio/i],
  ["1", /(?:^|\D)1(?:\s*[-–—]?\s*комн|\s*к(?:омн)?\.?|\s*bed)|однокомн/i],
  ["2", /(?:^|\D)2(?:\s*[-–—]?\s*комн|\s*к(?:омн)?\.?|\s*bed)|двухкомн/i],
  ["3", /(?:^|\D)3(?:\s*[-–—]?\s*комн|\s*к(?:омн)?\.?|\s*bed)|трёхкомн|трехкомн/i],
  ["4+", /4\s*\+|4\s*(?:[-–—]?\s*комн|\s*к(?:омн)?\.?|\s*bed)|многокомн/i],
];

function clean(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function parseNumericToken(value: string, millionContext = false): number | undefined {
  const token = value.replace(/[\u00a0\u202f\s]/g, "").replace(/[^\d,.-]/g, "");
  if (!token || token === "." || token === "," || token === "-") {
    return undefined;
  }

  const sign = token.startsWith("-") ? -1 : 1;
  const unsigned = token.replace(/^[+-]/, "");
  const separators = [...unsigned].filter((character) => character === "." || character === ",");
  let normalized = unsigned;

  if (separators.length > 1) {
    normalized = unsigned.replace(/[.,]/g, "");
  } else if (separators.length === 1) {
    const separatorIndex = Math.max(unsigned.indexOf("."), unsigned.indexOf(","));
    const digitsAfterSeparator = unsigned.length - separatorIndex - 1;
    // In a million label, a single separator followed by three digits is a
    // decimal fraction too (`6.900 млн` means 6.9 million). Multiple
    // separators remain grouped thousands (`5.698.000`).
    normalized = digitsAfterSeparator === 1 || digitsAfterSeparator === 2 || millionContext
      ? `${unsigned.slice(0, separatorIndex)}.${unsigned.slice(separatorIndex + 1)}`
      : unsigned.replace(/[.,]/g, "");
  }

  const parsed = Number(normalized) * sign;
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Converts a source price label into roubles while preserving incomplete values as absent. */
export function normalizeMoney(value: string): number | undefined {
  const normalized = value.trim().toLocaleLowerCase("ru-RU");
  if (!normalized || /^(?:от|по\s+запросу|уточняйте|нет|—|-)$/.test(normalized)) {
    return undefined;
  }

  const numberMatch = normalized.match(/[+-]?\d[\d\s\u00a0\u202f.,]*/);
  if (!numberMatch) {
    return undefined;
  }

  const isMillion = /(?:млн?|миллион|million)/.test(normalized);
  const number = parseNumericToken(numberMatch[0], isMillion);
  if (number === undefined || number <= 0) {
    return undefined;
  }

  // `\b` is ASCII-oriented in JavaScript and does not create a boundary after
  // Cyrillic text, so use the unit text directly here.
  const result = isMillion ? number * 1_000_000 : number;
  return result > 0 ? Math.round(result) : undefined;
}

/** Formats a total price; unlike per-metre prices it deliberately has no square-metre suffix. */
export function formatMoney(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "—";
  }
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const formatted = new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    }).format(millions);
    return `${formatted.replace(/[\u00a0\u202f]/g, " ")} млн ₽`;
  }

  const formatted = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(value);
  return `${formatted.replace(/[\u00a0\u202f]/g, " ")} ₽`;
}

function normalizeRoomKey(label: string | undefined): RoomKey | undefined {
  const normalized = clean(label);
  if (!normalized) {
    return undefined;
  }
  if (ROOM_KEYS.includes(normalized as RoomKey)) {
    return normalized as RoomKey;
  }
  return ROOM_LABELS.find(([, pattern]) => pattern.test(normalized))?.[0];
}

function normalizeNumberLabel(value: string | undefined): number | undefined {
  const normalized = clean(value);
  if (!normalized) {
    return undefined;
  }
  const match = normalized.match(/[+-]?\d[\d\s\u00a0\u202f.,]*/);
  if (!match) {
    return undefined;
  }
  const parsed = parseNumericToken(match[0]);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
}

function imageAsset(url: string | undefined): ImageAsset | undefined {
  const src = clean(url);
  return src ? { src, variants: [] } : undefined;
}

function normalizeLayout(source: SourceLayoutInput): Layout | undefined {
  const room = normalizeRoomKey(source.roomLabel);
  if (!room) {
    return undefined;
  }

  const layout: Layout = {
    id: source.id,
    room,
    notes: source.notes?.map((note) => note.trim()).filter(Boolean) ?? [],
  };
  const area = normalizeNumberLabel(source.areaLabel);
  const price = normalizeMoney(source.priceLabel ?? "");
  const pricePerMeter = normalizeMoney(source.pricePerMeterLabel ?? "");
  const floors = clean(source.floors);
  const entrances = clean(source.entrances);
  const image = imageAsset(source.imageUrl);
  if (area !== undefined) layout.area = area;
  if (price !== undefined) layout.price = price;
  if (pricePerMeter !== undefined) layout.pricePerMeter = pricePerMeter;
  if (floors !== undefined) layout.floors = floors;
  if (entrances !== undefined) layout.entrances = entrances;
  if (image !== undefined) layout.image = image;
  return layout;
}

function normalizeRoomPrices(labels: Partial<Record<RoomKey, string>> | undefined): RoomPrice[] {
  if (!labels) {
    return [];
  }
  return ROOM_KEYS.flatMap((room) => {
    const label = labels[room];
    if (label === undefined) {
      return [];
    }
    const price = normalizeMoney(label);
    return price === undefined ? [{ room }] : [{ room, minimumPrice: price }];
  });
}

export function normalizeProject(input: SourceProjectInput): Project {
  const minimumPrice = input.minimumPriceLabel === undefined
    ? undefined
    : normalizeMoney(input.minimumPriceLabel);
  const minimumPricePerMeter = input.minimumPricePerMeterLabel === undefined
    ? undefined
    : normalizeMoney(input.minimumPricePerMeterLabel);
  const coverImage = imageAsset(input.coverImageUrl);
  const gallery = input.galleryUrls?.flatMap((url) => {
    const image = imageAsset(url);
    return image ? [image] : [];
  }) ?? [];
  const layouts = input.layouts?.flatMap((layout) => {
    const normalized = normalizeLayout(layout);
    return normalized ? [normalized] : [];
  }) ?? [];
  const documents = input.documents ?? [];
  const dataQualityFlags: DataQualityFlag[] = [];
  if (minimumPrice === undefined) dataQualityFlags.push("missing-price");
  if (clean(input.completionLabel) === undefined) dataQualityFlags.push("missing-completion");
  if (coverImage === undefined) dataQualityFlags.push("missing-cover");
  if (documents.some((document) => document.status === "unverified")) {
    dataQualityFlags.push("unreachable-document");
  }

  const project: Project = {
    slug: input.slug,
    title: input.title,
    shortDescription: clean(input.shortDescription) ?? "",
    description: input.description?.map((paragraph) => paragraph.trim()).filter(Boolean) ?? [],
    roomPrices: normalizeRoomPrices(input.roomPriceLabels),
    features: input.features?.map((feature) => feature.trim()).filter(Boolean) ?? [],
    purchasePrograms: input.purchasePrograms?.map((program) => program.trim()).filter(Boolean) ?? [],
    gallery,
    documents,
    layouts,
    relatedProjectSlugs: input.relatedProjectSlugs?.map((slug) => slug.trim()).filter(Boolean) ?? [],
    sourceUrl: input.sourceUrl,
    sourceCheckedAt: input.sourceCheckedAt,
    dataQualityFlags,
  };

  const district = clean(input.district);
  const address = clean(input.address);
  const completionLabel = clean(input.completionLabel);
  const mortgageRateLabel = clean(input.mortgageRateLabel);
  const developer = clean(input.developer);
  if (district !== undefined) project.district = district;
  if (address !== undefined) project.address = address;
  if (completionLabel !== undefined) project.completionLabel = completionLabel;
  if (mortgageRateLabel !== undefined) project.mortgageRateLabel = mortgageRateLabel;
  if (developer !== undefined) project.developer = developer;
  if (minimumPrice !== undefined) project.minimumPrice = minimumPrice;
  if (minimumPricePerMeter !== undefined) project.minimumPricePerMeter = minimumPricePerMeter;
  if (coverImage !== undefined) project.coverImage = coverImage;
  return project;
}
