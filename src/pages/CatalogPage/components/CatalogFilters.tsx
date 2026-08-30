import type { CatalogQuery, CompletionFilter, RoomKey } from "../../../features/catalog/catalog.types";
import { MAXIMUM_PRICE_OPTIONS } from "../../../features/catalog/catalog-query";
import styles from "../CatalogPage.module.css";

const ROOM_OPTIONS: ReadonlyArray<{ label: string; value: RoomKey }> = [
  { label: "Студии", value: "studio" },
  { label: "1 комната", value: "1" },
  { label: "2 комнаты", value: "2" },
  { label: "3 комнаты", value: "3" },
  { label: "4+ комнаты", value: "4+" },
  { label: "Коммерческое", value: "commercial" },
];

interface CatalogFiltersProps {
  districts: readonly string[];
  onChange(query: CatalogQuery): void;
  query: CatalogQuery;
}

function withRoom(query: CatalogQuery, room: RoomKey, checked: boolean): CatalogQuery {
  const rooms = checked
    ? [...new Set([...(query.rooms ?? []), room])]
    : (query.rooms ?? []).filter((value) => value !== room);
  const next = { ...query };
  if (rooms.length > 0) next.rooms = rooms;
  else delete next.rooms;
  return next;
}

function withValue<K extends "district" | "maximumPrice" | "completion">(
  query: CatalogQuery,
  key: K,
  value: CatalogQuery[K] | undefined,
): CatalogQuery {
  const next = { ...query };
  if (value === undefined || value === "all") delete next[key];
  else Object.assign(next, { [key]: value });
  return next;
}

export function CatalogFilters({ districts, onChange, query }: CatalogFiltersProps) {
  return (
    <div className={styles.filterGroups}>
      <fieldset className={styles.filterGroup}>
        <legend>Район</legend>
        <div className={styles.chips}>
          {districts.map((district) => (
            <button
              aria-pressed={query.district === district}
              className={styles.chip}
              key={district}
              onClick={() => onChange(withValue(
                query,
                "district",
                query.district === district ? undefined : district,
              ))}
              type="button"
            >
              {district}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.filterGroup}>
        <legend>Комнаты</legend>
        <div className={styles.checks}>
          {ROOM_OPTIONS.map((room) => (
            <label className={styles.check} key={room.value}>
              <input
                checked={query.rooms?.includes(room.value) ?? false}
                onChange={(event) => onChange(withRoom(query, room.value, event.target.checked))}
                type="checkbox"
              />
              <span>{room.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className={styles.selectField}>
        <span>Максимальная цена</span>
        <select
          aria-label="Максимальная цена"
          onChange={(event) => onChange(withValue(
            query,
            "maximumPrice",
            event.target.value ? Number(event.target.value) : undefined,
          ))}
          value={query.maximumPrice ?? ""}
        >
          <option value="">Без ограничения</option>
          {MAXIMUM_PRICE_OPTIONS.map((price) => (
            <option key={price} value={price}>до {price / 1_000_000} млн ₽</option>
          ))}
        </select>
      </label>

      <label className={styles.selectField}>
        <span>Срок сдачи</span>
        <select
          aria-label="Срок сдачи"
          onChange={(event) => onChange(withValue(
            query,
            "completion",
            event.target.value as CompletionFilter,
          ))}
          value={query.completion ?? "all"}
        >
          <option value="all">Любой срок</option>
          <option value="ready">Дом сдан</option>
          <option value="2026">2026</option>
          <option value="2027">2027</option>
          <option value="2028+">2028 и позже</option>
        </select>
      </label>
    </div>
  );
}
