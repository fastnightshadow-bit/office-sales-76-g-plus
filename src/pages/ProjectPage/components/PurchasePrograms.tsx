import styles from "../ProjectPage.module.css";

interface PurchaseProgramsProps {
  features: string[];
  programs: string[];
}

export function PurchasePrograms({ features, programs }: PurchaseProgramsProps) {
  if (features.length === 0 && programs.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={`container ${styles.programColumns}`}>
        {features.length > 0 ? (
          <div>
            <h2>Особенности проекта</h2>
            <ul>{features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
          </div>
        ) : null}
        {programs.length > 0 ? (
          <div>
            <h2>Программы покупки</h2>
            <ul>{programs.map((program) => <li key={program}>{program}</li>)}</ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
