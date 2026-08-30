import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { filterProjects } from "../../../features/catalog/catalog-filters";
import { MAXIMUM_PRICE_OPTIONS, serializeCatalogQuery } from "../../../features/catalog/catalog-query";
import type { CatalogQuery, ProjectSummary, RoomKey } from "../../../features/catalog/catalog.types";
import styles from "./HeroSearch.module.css";

interface HeroSearchProps {
  projects: readonly ProjectSummary[];
}

const roomOptions: Array<{ label: string; value: RoomKey }> = [
  { label: "Студия", value: "studio" },
  { label: "1 комната", value: "1" },
  { label: "2 комнаты", value: "2" },
  { label: "3 комнаты", value: "3" },
  { label: "4+ комнаты", value: "4+" },
  { label: "Коммерческое", value: "commercial" },
];

function projectWord(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "проектов";
  if (last === 1) return "проект";
  if (last >= 2 && last <= 4) return "проекта";
  return "проектов";
}

function useMobileSearch() {
  const query = "(max-width: 767px)";
  const [mobile, setMobile] = useState(() => (
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false
  ));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(query);
    const update = (event: MediaQueryListEvent) => setMobile(event.matches);
    setMobile(media.matches);
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  return mobile;
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), select:not([disabled]), input:not([disabled]), a[href]',
  )).filter((element) => !element.hasAttribute("hidden"));
}

function updateQuery(query: CatalogQuery, field: "room" | "maximumPrice" | "district", value: string): CatalogQuery {
  const next = { ...query };
  if (field === "room") {
    if (value) next.rooms = [value as RoomKey];
    else delete next.rooms;
  } else if (field === "maximumPrice") {
    if (value) next.maximumPrice = Number(value);
    else delete next.maximumPrice;
  } else if (value) next.district = value;
  else delete next.district;
  return next;
}

interface FieldsProps {
  query: CatalogQuery;
  districts: readonly string[];
  onChange: (query: CatalogQuery) => void;
}

function SearchFields({ query, districts, onChange }: FieldsProps) {
  return (
    <>
      <label className={styles.field}>
        <span>Комнаты</span>
        <select
          aria-label="Комнаты"
          onChange={(event) => onChange(updateQuery(query, "room", event.target.value))}
          value={query.rooms?.[0] ?? ""}
        >
          <option value="">Любые</option>
          {roomOptions.map((room) => <option key={room.value} value={room.value}>{room.label}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span>Максимальная цена</span>
        <select
          aria-label="Максимальная цена"
          onChange={(event) => onChange(updateQuery(query, "maximumPrice", event.target.value))}
          value={query.maximumPrice ?? ""}
        >
          <option value="">Без ограничения</option>
          {MAXIMUM_PRICE_OPTIONS.map((price) => <option key={price} value={price}>до {price / 1_000_000} млн ₽</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span>Район</span>
        <select
          aria-label="Район"
          onChange={(event) => onChange(updateQuery(query, "district", event.target.value))}
          value={query.district ?? ""}
        >
          <option value="">Весь Ярославль</option>
          {districts.map((district) => <option key={district} value={district}>{district}</option>)}
        </select>
      </label>
    </>
  );
}

export function HeroSearch({ projects }: HeroSearchProps) {
  const navigate = useNavigate();
  const mobile = useMobileSearch();
  const [query, setQuery] = useState<CatalogQuery>({});
  const [draft, setDraft] = useState<CatalogQuery>({});
  const [open, setOpen] = useState(false);
  const [portalElement, setPortalElement] = useState<HTMLDivElement | null>(null);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const districts = useMemo(() => [...new Set(projects.flatMap(({ district }) => district ? [district] : []))]
    .sort((a, b) => a.localeCompare(b, "ru-RU")), [projects]);
  const desktopCount = filterProjects(projects, query).length;
  const mobileCount = filterProjects(projects, draft).length;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const element = document.createElement("div");
    element.dataset.heroSearchPortal = "";
    document.body.append(element);
    setPortalElement(element);
    return () => element.remove();
  }, []);

  useEffect(() => {
    if (!mobile) setOpen(false);
  }, [mobile]);

  useEffect(() => {
    if (!open || !portalElement || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    const snapshots = Array.from(document.body.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement && child !== portalElement)
      .map((element) => ({
        element,
        inert: element.inert,
        hadInert: element.hasAttribute("inert"),
        ariaHidden: element.getAttribute("aria-hidden"),
      }));

    snapshots.forEach(({ element }) => {
      element.inert = true;
      element.setAttribute("inert", "");
      element.setAttribute("aria-hidden", "true");
    });
    document.body.style.overflow = "hidden";
    getFocusableElements(sheetRef.current ?? portalElement)[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = getFocusableElements(sheetRef.current);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !sheetRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      snapshots.forEach(({ element, inert, hadInert, ariaHidden }) => {
        element.inert = inert;
        if (!hadInert) element.removeAttribute("inert");
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      if (triggerRef.current && document.contains(triggerRef.current)) triggerRef.current.focus();
    };
  }, [open, portalElement]);

  const submit = (nextQuery: CatalogQuery) => {
    const params = serializeCatalogQuery(nextQuery);
    navigate({ pathname: "/catalog", search: params.toString() });
  };

  const handleDesktopSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(query);
  };

  const sheet = open && portalElement ? createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div aria-labelledby={titleId} aria-modal="true" className={styles.sheet} ref={sheetRef} role="dialog">
        <div className={styles.sheetHeader}>
          <div>
            <p className={styles.sheetEyebrow}>Поиск по {projects.length} проектам</p>
            <h2 id={titleId}>Фильтры поиска</h2>
          </div>
          <button aria-label="Закрыть фильтры" className={styles.close} onClick={() => setOpen(false)} type="button">
            <X aria-hidden="true" size={22} />
          </button>
        </div>
        <div className={styles.sheetFields}>
          <SearchFields districts={districts} onChange={setDraft} query={draft} />
        </div>
        <button
          className={styles.apply}
          onClick={() => {
            setQuery(draft);
            submit(draft);
          }}
          type="button"
        >
          Показать {mobileCount} {projectWord(mobileCount)}
        </button>
      </div>
    </div>,
    portalElement,
  ) : null;

  if (mobile) {
    return (
      <>
        <button
          aria-expanded={open}
          className={styles.mobileTrigger}
          onClick={() => {
            setDraft(query);
            setOpen(true);
          }}
          ref={triggerRef}
          type="button"
        >
          <SlidersHorizontal aria-hidden="true" size={20} />
          <span>Комнаты · Цена · Район</span>
        </button>
        {sheet}
      </>
    );
  }

  return (
    <form aria-label="Поиск новостроек" className={styles.desktopSearch} onSubmit={handleDesktopSubmit}>
      <SearchFields districts={districts} onChange={setQuery} query={query} />
      <button className={styles.submit} type="submit">
        <Search aria-hidden="true" size={19} />
        <span>Показать {desktopCount} {projectWord(desktopCount)}</span>
      </button>
    </form>
  );
}
