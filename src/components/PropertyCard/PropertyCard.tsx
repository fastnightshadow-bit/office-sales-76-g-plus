import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import type { Project } from "../../features/catalog/catalog.types";
import { formatMoney } from "../../features/catalog/normalize-project";
import { useFavorites } from "../../features/favorites/use-favorites";
import { ResponsiveImage } from "../ResponsiveImage/ResponsiveImage";
import styles from "./PropertyCard.module.css";

export interface PropertyCardProps {
  project: Pick<Project,
    | "slug"
    | "title"
    | "shortDescription"
    | "district"
    | "completionLabel"
    | "minimumPrice"
    | "coverImage"
  >;
  variant?: "featured" | "compact";
  eagerImage?: boolean;
  headingLevel?: 2 | 3;
}

export function PropertyCard({
  eagerImage = false,
  headingLevel = 3,
  project,
  variant = "compact",
}: PropertyCardProps) {
  const { isFavorite, toggle } = useFavorites();
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const favorite = isFavorite(project.slug);
  const projectPath = `/catalog/${project.slug}`;
  const price = project.minimumPrice !== undefined && project.minimumPrice > 0
    ? `от ${formatMoney(project.minimumPrice)}`
    : "Цена по запросу";

  return (
    <article className={`${styles.card} ${styles[variant]}`} data-variant={variant}>
      <div className={styles.media}>
        <Link aria-label={`Подробнее о проекте ${project.title}`} className={styles.imageLink} to={projectPath}>
          <ResponsiveImage
            alt={`Фасад проекта ${project.title}`}
            {...(project.coverImage ? { asset: project.coverImage } : {})}
            {...(eagerImage ? { compactSourceWidth: 480 as const } : {})}
            eager={eagerImage}
            imageClassName={styles.image!}
            ratio={variant === "featured" ? "5 / 4" : "4 / 3"}
            sizes={variant === "featured"
              ? "(max-width: 767px) calc(100vw - 40px), (max-width: 1279px) 50vw, 420px"
              : "(max-width: 767px) calc(100vw - 40px), 360px"}
          />
        </Link>
        <button
          aria-label={favorite
            ? `Убрать ${project.title} из избранного`
            : `Добавить ${project.title} в избранное`}
          aria-pressed={favorite}
          className={styles.favorite}
          onClick={() => toggle(project.slug)}
          type="button"
        >
          <Heart aria-hidden="true" fill={favorite ? "currentColor" : "none"} size={20} strokeWidth={1.8} />
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.meta}>
          {project.district ? <span>{project.district}</span> : null}
          {project.completionLabel ? <span>{project.completionLabel}</span> : null}
        </div>
        <Heading className={styles.title}>
          <Link to={projectPath}>{project.title}</Link>
        </Heading>
        {project.shortDescription ? <p className={styles.description}>{project.shortDescription}</p> : null}
        <p className={styles.price}>{price}</p>
      </div>
    </article>
  );
}
