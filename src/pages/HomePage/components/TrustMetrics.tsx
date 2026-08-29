import type { Project } from "../../../features/catalog/catalog.types";
import styles from "../HomePage.module.css";

export function TrustMetrics({ projects }: { projects: readonly Project[] }) {
  const districts = new Set(projects.flatMap(({ district }) => district ? [district] : [])).size;
  const pricedProjects = projects.filter(({ minimumPrice }) => minimumPrice !== undefined).length;
  const metrics = [
    { value: String(projects.length), label: "проекта" },
    { value: String(districts), label: "районов города" },
    { value: String(pricedProjects), label: "проектов с указанной ценой" },
  ];

  return (
    <section aria-label="Каталог в цифрах" className={`container ${styles.metrics}`}>
      <div className={styles.metricIntro}>
        <p className={styles.kicker}>Проверенный срез каталога</p>
        <p>Только то, что действительно есть в локальном снимке источника.</p>
      </div>
      {metrics.map(({ value, label }) => (
        <div className={styles.metric} key={label}>
          <strong>{value} {label}</strong>
        </div>
      ))}
    </section>
  );
}
