import { SearchX } from "lucide-react";
import styles from "../CatalogPage.module.css";

export function EmptyCatalog({ onReset }: { onReset(): void }) {
  return (
    <section className={styles.empty}>
      <SearchX aria-hidden="true" size={34} strokeWidth={1.5} />
      <h2>Ничего не нашли</h2>
      <p>Попробуйте изменить параметры — возможно, подходящий проект скрыт одним из фильтров.</p>
      <button onClick={onReset} type="button">Сбросить фильтры</button>
    </section>
  );
}
