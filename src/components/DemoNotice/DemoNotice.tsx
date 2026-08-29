import sourceReport from "../../data/source-report.json";
import styles from "./DemoNotice.module.css";

interface DemoNoticeProps {
  compact?: boolean;
  className?: string;
}

function formatSnapshotDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function DemoNotice({ compact = false, className }: DemoNoticeProps) {
  return (
    <aside className={`${styles.notice} ${compact ? styles.compact : ""} ${className ?? ""}`}>
      <span className={styles.badge}>Частная демонстрация</span>
      <p>
        Каталог — локальный снимок от{" "}
        <time dateTime={sourceReport.sourceCheckedAt}>
          {formatSnapshotDate(sourceReport.sourceCheckedAt)}
        </time>. Актуальность и наличие уточняйте у менеджера.
      </p>
    </aside>
  );
}
