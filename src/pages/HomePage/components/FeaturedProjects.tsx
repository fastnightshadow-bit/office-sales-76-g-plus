import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { PropertyCard } from "../../../components/PropertyCard/PropertyCard";
import { SectionHeading } from "../../../components/SectionHeading/SectionHeading";
import type { Project } from "../../../features/catalog/catalog.types";
import styles from "../HomePage.module.css";

export function selectFeaturedProjects(projects: readonly Project[]): Project[] {
  return projects
    .filter((project) => (
      project.coverImage !== undefined
      && project.minimumPrice !== undefined
      && project.minimumPrice > 0
      && !project.dataQualityFlags.includes("untrusted-price")
    ))
    .sort((left, right) => left.slug.localeCompare(right.slug, "ru-RU"))
    .slice(0, 3);
}

export function FeaturedProjects({ projects }: { projects: readonly Project[] }) {
  const featured = selectFeaturedProjects(projects);
  return (
    <section className={`container ${styles.sectionInner}`}>
      <div className={styles.sectionTopline}>
        <SectionHeading
          description="Три проекта с локальными фотографиями и указанной в источнике минимальной полной ценой."
          eyebrow="Выбор редакции"
          title="Проекты, с которых стоит начать"
        />
        <Link className={styles.textLink} to="/catalog">
          Все {projects.length} проекта
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </div>
      <div className={styles.featuredGrid}>
        {featured.map((project) => <PropertyCard key={project.slug} project={project} variant="featured" />)}
      </div>
    </section>
  );
}
