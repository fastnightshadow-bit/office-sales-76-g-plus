import { ArrowUpRight } from "lucide-react";
import { Button } from "../../../components/Button/Button";
import styles from "../HomePage.module.css";

export function DeveloperCta({ onRequest }: { onRequest: () => void }) {
  return (
    <section className={`container ${styles.developerInner}`}>
      <div>
        <p className={styles.kicker}>Застройщикам</p>
        <h2>Партнёрство, которое помогает проекту быть понятнее покупателю</h2>
      </div>
      <div className={styles.developerCopy}>
        <p>Обсудим представление проекта, работу с обращениями и формат совместных продаж.</p>
        <Button onClick={onRequest} size="large">
          Запросить презентацию
          <ArrowUpRight aria-hidden="true" size={18} />
        </Button>
        <small>Откроется локальная демо-форма. Файлы и контактные данные не отправляются.</small>
      </div>
    </section>
  );
}
