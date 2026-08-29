import styles from "./PageSkeleton.module.css";

interface PageSkeletonProps {
  label?: string;
}

export function PageSkeleton({ label = "Загрузка страницы" }: PageSkeletonProps) {
  return (
    <div aria-label={label} aria-live="polite" className={styles.skeleton} role="status">
      <span className="visually-hidden">{label}</span>
      <div className={styles.heading} />
      <div className={styles.line} />
      <div className={styles.grid}>
        <div className={styles.card} />
        <div className={styles.card} />
        <div className={styles.card} />
      </div>
    </div>
  );
}
