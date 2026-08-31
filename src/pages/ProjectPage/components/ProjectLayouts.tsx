import { ResponsiveImage } from "../../../components/ResponsiveImage/ResponsiveImage";
import type { Layout } from "../../../features/catalog/catalog.types";
import { useMemo, useState } from "react";
import styles from "../ProjectPage.module.css";

interface ProjectLayoutsProps {
  layouts: Layout[];
}

function formatArea(area: number): string {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(area)} м²`;
}

function formatTotalMoney(value: number): string {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 })
    .format(value)
    .replace(/[\u00a0\u202f]/g, " ")} ₽`;
}

function formatPricePerMeter(value: number): string {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 })
    .format(value)
    .replace(/[\u00a0\u202f]/g, " ")} ₽/м²`;
}

const roomLabels = {
  studio: "Студии",
  "1": "1-комнатные",
  "2": "2-комнатные",
  "3": "3-комнатные",
  "4+": "4+ комнат",
  commercial: "Коммерческие",
} as const;

const roomOrder = ["studio", "1", "2", "3", "4+", "commercial"] as const;

export function ProjectLayouts({ layouts }: ProjectLayoutsProps) {
  const rooms = useMemo(() => roomOrder.filter((room) => layouts.some((layout) => layout.room === room)), [layouts]);
  const [selectedRoom, setSelectedRoom] = useState<Layout["room"]>("studio");
  if (layouts.length === 0) return null;
  const activeRoom = rooms.includes(selectedRoom) ? selectedRoom : rooms[0]!;
  const visibleLayouts = layouts.filter((layout) => layout.room === activeRoom);

  return (
    <section className={styles.section} id="layouts">
      <div className="container">
        <div className={styles.sectionHeading}>
          <p>Выбор квартиры</p>
          <h2>Планировки</h2>
        </div>
        {rooms.length > 1 ? (
          <div aria-label="Комнатность планировок" className={styles.layoutTabs} role="tablist">
            {rooms.map((room) => (
              <button
                aria-selected={activeRoom === room}
                className={styles.layoutTab}
                key={room}
                onClick={() => setSelectedRoom(room)}
                role="tab"
                type="button"
              >
                {roomLabels[room]}
              </button>
            ))}
          </div>
        ) : null}
        <div className={styles.layoutGrid}>
          {visibleLayouts.map((layout) => {
            const areaLabel = layout.area !== undefined && layout.area > 0 ? formatArea(layout.area) : undefined;
            const ariaLabel = `Планировка ${layout.roomLabel}${areaLabel ? `, ${areaLabel}` : ""}`;
            return (
              <article aria-label={ariaLabel} className={styles.layoutCard} key={layout.id}>
                {layout.image ? (
                  <ResponsiveImage
                    alt={`${layout.roomLabel}${areaLabel ? `, ${areaLabel}` : ""}`}
                    asset={layout.image}
                    imageClassName={styles.layoutImage!}
                    ratio="4 / 3"
                    sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) 45vw, 300px"
                  />
                ) : null}
                <div className={styles.layoutBody}>
                  <h3>{layout.roomLabel}</h3>
                  <dl className={styles.layoutFacts}>
                    {areaLabel ? <div><dt>Площадь</dt><dd>{areaLabel}</dd></div> : null}
                    {layout.pricePerMeter !== undefined && layout.pricePerMeter > 0
                      ? <div><dt>Цена за м²</dt><dd>{formatPricePerMeter(layout.pricePerMeter)}</dd></div>
                      : null}
                    {layout.floors ? <div><dt>Этаж</dt><dd>{layout.floors}</dd></div> : null}
                    {layout.entrances ? <div><dt>Подъезд</dt><dd>{layout.entrances}</dd></div> : null}
                  </dl>
                  {layout.notes.length > 0 ? (
                    <ul className={styles.layoutNotes}>
                      {layout.notes.map((note) => <li key={note}>{note}</li>)}
                    </ul>
                  ) : null}
                  {layout.price !== undefined && layout.price > 0
                    ? <p className={styles.layoutPrice}>{formatTotalMoney(layout.price)}</p>
                    : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
