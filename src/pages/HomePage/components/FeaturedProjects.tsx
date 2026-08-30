import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { PropertyCard } from "../../../components/PropertyCard/PropertyCard";
import { SectionHeading } from "../../../components/SectionHeading/SectionHeading";
import type { ProjectSummary } from "../../../features/catalog/catalog.types";
import styles from "../HomePage.module.css";

const FEATURED_PROJECT_SLUGS = [
  "zhk-novatsiya",
  "zhk-yaroslavl-siti-1-ztap",
  "zhk-granat",
] as const;

export function selectFeaturedProjects(projects: readonly ProjectSummary[]): ProjectSummary[] {
  const eligibleBySlug = new Map(projects
    .filter((project) => (
      project.coverImage !== undefined
      && project.minimumPrice !== undefined
      && project.minimumPrice > 0
      && !project.dataQualityFlags.includes("untrusted-price")
    ))
    .map((project) => [project.slug, project]));

  return FEATURED_PROJECT_SLUGS.flatMap((slug) => {
    const project = eligibleBySlug.get(slug);
    return project ? [project] : [];
  });
}

export function FeaturedProjects({ projects }: { projects: readonly ProjectSummary[] }) {
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
