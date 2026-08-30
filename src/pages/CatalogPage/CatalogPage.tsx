import { X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PropertyCard } from "../../components/PropertyCard/PropertyCard";
import { filterProjects } from "../../features/catalog/catalog-filters";
import { parseCatalogQuery, serializeCatalogQuery } from "../../features/catalog/catalog-query";
import { getProjects } from "../../features/catalog/catalog-repository";
import type { CatalogQuery, CatalogSort } from "../../features/catalog/catalog.types";
import styles from "./CatalogPage.module.css";
import { CatalogFilters } from "./components/CatalogFilters";
import { CatalogToolbar } from "./components/CatalogToolbar";
import { EmptyCatalog } from "./components/EmptyCatalog";
import { useSearchParams } from "react-router-dom";

const PAGE_SIZE = 18;
const projects = getProjects();

function projectWord(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "проектов";
  if (last === 1) return "проект";
  if (last >= 2 && last <= 4) return "проекта";
  return "проектов";
}

function foundLabel(count: number): string {
  return `${count % 10 === 1 && count % 100 !== 11 ? "Найден" : "Найдено"} ${count} ${projectWord(count)}`;
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), select:not([disabled]), input:not([disabled]), a[href]',
  ));
}

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseCatalogQuery(searchParams), [searchParams]);
  const queryKey = serializeCatalogQuery(query).toString();
  const [search, setSearch] = useState(query.text ?? "");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<CatalogQuery>(query);
  const [portalElement, setPortalElement] = useState<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogTitleId = useId();

  const districts = useMemo(() => [...new Set(projects.flatMap(({ district }) => district ? [district] : []))]
    .sort((left, right) => left.localeCompare(right, "ru-RU")), []);
  const filteredProjects = useMemo(() => filterProjects(projects, query), [queryKey]);
  const draftCount = useMemo(() => filterProjects(projects, draft).length, [draft]);
  const visibleProjects = filteredProjects.slice(0, visibleCount);

  const commit = (next: CatalogQuery) => {
    setSearchParams(serializeCatalogQuery(next));
  };

  const reset = () => {
    setSearch("");
    setSearchParams(new URLSearchParams());
  };

  useEffect(() => {
    const element = document.createElement("div");
    element.dataset.catalogFiltersPortal = "";
    document.body.append(element);
    setPortalElement(element);
    return () => element.remove();
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [queryKey]);

  useEffect(() => {
    setSearch(query.text ?? "");
  }, [query.text]);

  useEffect(() => {
    const currentText = query.text ?? "";
    if (search === currentText) return;
    const timeout = window.setTimeout(() => {
      const next = { ...query };
      if (search.trim()) next.text = search.trim();
      else delete next.text;
      commit(next);
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [queryKey, search]);

  useEffect(() => {
    if (!filtersOpen || !portalElement) return;
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
    getFocusableElements(dialogRef.current!)[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setFiltersOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = getFocusableElements(dialogRef.current);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
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
      filterTriggerRef.current?.focus();
    };
  }, [filtersOpen, portalElement]);

  const updateSort = (sort: CatalogSort) => {
    const next = { ...query };
    if (sort === "featured") delete next.sort;
    else next.sort = sort;
    commit(next);
  };

  const filterSheet = filtersOpen && portalElement ? createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setFiltersOpen(false);
      }}
    >
      <div
        aria-labelledby={dialogTitleId}
        aria-modal="true"
        className={styles.sheet}
        ref={dialogRef}
        role="dialog"
      >
        <div className={styles.sheetHeader}>
          <h2 id={dialogTitleId}>Фильтры каталога</h2>
          <button aria-label="Закрыть фильтры" onClick={() => setFiltersOpen(false)} type="button">
            <X aria-hidden="true" size={22} />
          </button>
        </div>
        <div className={styles.sheetBody}>
          <CatalogFilters districts={districts} onChange={setDraft} query={draft} />
        </div>
        <button
          className={styles.apply}
          onClick={() => {
            commit(draft);
            setFiltersOpen(false);
          }}
          type="button"
        >
          Показать {draftCount} {projectWord(draftCount)}
        </button>
      </div>
    </div>,
    portalElement,
  ) : null;

  return (
    <section className={styles.page}>
      <div>
        <div className={`container ${styles.header}`}>
          <p className={styles.eyebrow}>Новостройки Ярославля</p>
          <h1>Каталог проектов</h1>
          <p>Сравните все 92 локально сохранённых проекта по району, сроку и полной минимальной цене.</p>
        </div>

        <div className={`container ${styles.catalog}`}>
          <CatalogToolbar
            filterButtonRef={filterTriggerRef}
            onOpenFilters={() => {
              setDraft(query);
              setFiltersOpen(true);
            }}
            onSearchChange={setSearch}
            onSortChange={updateSort}
            search={search}
            sort={query.sort ?? "featured"}
          />

          <div className={styles.layout}>
            <aside aria-label="Фильтры каталога" className={styles.sidebar}>
              <div className={styles.sidebarHeading}>
                <h2>Фильтры</h2>
              </div>
              <CatalogFilters districts={districts} onChange={commit} query={query} />
            </aside>

            <div className={styles.results}>
              <div className={styles.resultsTopline}>
                <p aria-label="Количество найденных проектов" aria-live="polite" role="status">
                  {foundLabel(filteredProjects.length)}
                </p>
                {queryKey && filteredProjects.length > 0 ? (
                  <button className={styles.inlineReset} onClick={reset} type="button">Сбросить фильтры</button>
                ) : null}
              </div>
              {filteredProjects.length > 0 ? (
                <>
                  <div className={styles.grid}>
                    {visibleProjects.map((project, index) => (
                      <PropertyCard
                        eagerImage={index === 0}
                        headingLevel={2}
                        key={project.slug}
                        project={project}
                        variant="compact"
                      />
                    ))}
                  </div>
                  {visibleCount < filteredProjects.length ? (
                    <button
                      className={styles.loadMore}
                      onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                      type="button"
                    >
                      Показать ещё
                    </button>
                  ) : null}
                </>
              ) : <EmptyCatalog onReset={reset} />}
            </div>
          </div>
        </div>
      </div>

      {filterSheet}
    </section>
  );
}
