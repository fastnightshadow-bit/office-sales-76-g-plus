import { Search, SlidersHorizontal } from "lucide-react";
import type { Ref } from "react";
import type { CatalogSort } from "../../../features/catalog/catalog.types";
import styles from "../CatalogPage.module.css";

interface CatalogToolbarProps {
  filterButtonRef: Ref<HTMLButtonElement>;
  onOpenFilters(): void;
  onSearchChange(value: string): void;
  onSortChange(value: CatalogSort): void;
  search: string;
  sort: CatalogSort;
}

export function CatalogToolbar({
  filterButtonRef,
  onOpenFilters,
  onSearchChange,
  onSortChange,
  search,
  sort,
}: CatalogToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <label className={styles.search}>
        <Search aria-hidden="true" size={20} />
        <span className="visually-hidden">Поиск по каталогу</span>
        <input
          aria-label="Поиск по каталогу"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Название, район или адрес"
          type="search"
          value={search}
        />
      </label>
      <button className={styles.mobileFilterButton} onClick={onOpenFilters} ref={filterButtonRef} type="button">
        <SlidersHorizontal aria-hidden="true" size={19} />
        Открыть фильтры
      </button>
      <label className={styles.sort}>
        <span>Сортировка</span>
        <select
          aria-label="Сортировка"
          onChange={(event) => onSortChange(event.target.value as CatalogSort)}
          value={sort}
        >
          <option value="featured">По умолчанию</option>
          <option value="price-asc">Сначала дешевле</option>
          <option value="price-desc">Сначала дороже</option>
          <option value="completion">По сроку сдачи</option>
        </select>
      </label>
    </div>
  );
}
