import { MapPin } from "lucide-react";
import type { Project, RoomKey } from "../../../features/catalog/catalog.types";
import styles from "../ProjectPage.module.css";

const roomNames: Record<RoomKey, string> = {
  studio: "Студии",
  "1": "1-комнатные",
  "2": "2-комнатные",
  "3": "3-комнатные",
  "4+": "4+ комнат",
  commercial: "Коммерческие",
};

interface ProjectFactsProps {
  project: Pick<Project, "address" | "completionLabel" | "mortgageRateLabel" | "roomPrices">;
}

function formatTotalMoney(value: number): string {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 })
    .format(value)
    .replace(/[\u00a0\u202f]/g, " ")} ₽`;
}

export function ProjectFacts({ project }: ProjectFactsProps) {
  const facts = [
    project.completionLabel ? { label: "Срок", value: project.completionLabel } : null,
    project.mortgageRateLabel
      ? { label: "Условия", value: `Ипотека ${project.mortgageRateLabel}` }
      : null,
  ].filter((fact): fact is { label: string; value: string } => fact !== null);
  const roomPrices = project.roomPrices.filter(
    (item): item is typeof item & { minimumPrice: number } =>
      item.minimumPrice !== undefined && item.minimumPrice > 0,
  );

  return (
    <div className={styles.factsArea}>
      {project.address ? (
        <div className={styles.addressBlock}>
          <MapPin aria-hidden="true" size={22} strokeWidth={1.7} />
          <div>
            <p>{project.address}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.address)}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              Открыть адрес на карте
            </a>
          </div>
        </div>
      ) : null}

      {facts.length > 0 ? (
        <dl className={styles.facts}>
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {roomPrices.length > 0 ? (
        <div className={styles.roomPrices} aria-label="Минимальная стоимость по комнатности">
          {roomPrices.map((item) => (
            <div className={styles.roomPrice} key={item.room}>
              <span>{roomNames[item.room]}</span>
              <strong>от {formatTotalMoney(item.minimumPrice)}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
