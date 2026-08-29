import { Building2, KeyRound, Landmark, Scale } from "lucide-react";
import { SectionHeading } from "../../../components/SectionHeading/SectionHeading";
import styles from "../HomePage.module.css";

const steps = [
  { icon: Building2, number: "01", title: "Сравним новостройки", text: "Соберём варианты по району, бюджету и формату квартиры в одной понятной подборке." },
  { icon: KeyRound, number: "02", title: "Организуем показы", text: "Поможем составить маршрут и посмотреть подходящие проекты без лишних поездок." },
  { icon: Landmark, number: "03", title: "Разберём ипотеку", text: "Сопоставим доступные программы и объясним условия простым языком." },
  { icon: Scale, number: "04", title: "Сопроводим выбор", text: "Останемся рядом на пути от первого сравнения до решения о покупке." },
] as const;

export function ServiceSteps() {
  return (
    <section className={`container ${styles.sectionInner}`}>
      <SectionHeading
        description="Один специалист помогает пройти весь путь и держит сравнение объектов в фокусе."
        eyebrow="Как устроена услуга"
        title="От первого списка до выбранного дома"
      />
      <ol className={styles.steps}>
        {steps.map(({ icon: Icon, number, title, text }) => (
          <li key={number}>
            <div className={styles.stepHead}>
              <Icon aria-hidden="true" size={23} strokeWidth={1.6} />
              <span>{number}</span>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
