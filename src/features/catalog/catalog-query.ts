import type { CatalogQuery, CatalogSort, CompletionFilter, RoomKey } from "./catalog.types";

export type { CatalogQuery, CatalogSort, CompletionFilter } from "./catalog.types";

const ROOM_KEYS = new Set<RoomKey>(["studio", "1", "2", "3", "4+", "commercial"]);
const COMPLETION_FILTERS = new Set<CompletionFilter>(["all", "ready", "2026", "2027", "2028+"]);
const SORTS = new Set<CatalogSort>(["featured", "price-asc", "price-desc", "completion"]);
export const MAXIMUM_PRICE_OPTIONS = [5_000_000, 7_000_000, 10_000_000, 15_000_000] as const;
const MAXIMUM_PRICES = new Set<number>(MAXIMUM_PRICE_OPTIONS);

function nonEmpty(value: string | null): string | undefined {
  return value !== null && value.length > 0 ? value : undefined;
}

function validRoom(value: string): value is RoomKey {
  return ROOM_KEYS.has(value as RoomKey);
}

function validCompletion(value: string | null): value is CompletionFilter {
  return value !== null && COMPLETION_FILTERS.has(value as CompletionFilter);
}

function validSort(value: string | null): value is CatalogSort {
  return value !== null && SORTS.has(value as CatalogSort);
}

function asParams(params: URLSearchParams | string): URLSearchParams {
  return typeof params === "string" ? new URLSearchParams(params) : params;
}

export function parseCatalogQuery(params: URLSearchParams | string): CatalogQuery {
  const source = asParams(params);
  const query: CatalogQuery = {};
  const text = nonEmpty(source.get("text"));
  const district = nonEmpty(source.get("district"));
  if (text !== undefined) query.text = text;
  if (district !== undefined) query.district = district;

  const rooms = source.getAll("rooms").flatMap((value) => value.split(","))
    .filter(validRoom)
    .filter((room, index, values) => values.indexOf(room) === index);
  if (rooms.length > 0) query.rooms = rooms;

  const maximumPriceText = source.get("maximumPrice");
  if (maximumPriceText !== null) {
    const maximumPrice = Number(maximumPriceText);
    if (MAXIMUM_PRICES.has(maximumPrice)) query.maximumPrice = maximumPrice;
  }

  const completion = source.get("completion");
  if (validCompletion(completion) && completion !== "all") query.completion = completion;
  const sort = source.get("sort");
  if (validSort(sort) && sort !== "featured") query.sort = sort;
  return query;
}

export function serializeCatalogQuery(query: CatalogQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.text !== undefined && query.text.length > 0) params.set("text", query.text);
  if (query.district !== undefined && query.district.length > 0) params.set("district", query.district);

  const rooms = (query.rooms ?? []).filter(validRoom)
    .filter((room, index, values) => values.indexOf(room) === index);
  for (const room of rooms) params.append("rooms", room);

  if (query.maximumPrice !== undefined
    && MAXIMUM_PRICES.has(query.maximumPrice)) {
    params.set("maximumPrice", String(query.maximumPrice));
  }
  if (query.completion !== undefined && validCompletion(query.completion) && query.completion !== "all") {
    params.set("completion", query.completion);
  }
  if (query.sort !== undefined && validSort(query.sort) && query.sort !== "featured") {
    params.set("sort", query.sort);
  }
  return params;
}
