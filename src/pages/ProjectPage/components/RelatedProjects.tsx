import { PropertyCard } from "../../../components/PropertyCard/PropertyCard";
import type { Project } from "../../../features/catalog/catalog.types";
import styles from "../ProjectPage.module.css";

interface RelatedProjectsProps {
  project: Project;
  projects: readonly Project[];
}

function selectRelatedProjects(project: Project, projects: readonly Project[]): Project[] {
  const bySlug = new Map(projects.map((candidate) => [candidate.slug, candidate]));
  const selected = project.relatedProjectSlugs
    .map((slug) => bySlug.get(slug))
    .filter((candidate): candidate is Project => candidate !== undefined && candidate.slug !== project.slug);

  if (selected.length < 3 && project.district) {
    for (const candidate of projects) {
      if (selected.length === 3) break;
      if (
        candidate.slug !== project.slug
        && candidate.district === project.district
        && !selected.some(({ slug }) => slug === candidate.slug)
      ) selected.push(candidate);
    }
  }

  return selected.slice(0, 3);
}

export function RelatedProjects({ project, projects }: RelatedProjectsProps) {
  const related = selectRelatedProjects(project, projects);
  if (related.length === 0) return null;

  return (
    <section className={`${styles.section} ${styles.relatedSection}`}>
      <div className="container">
        <div className={styles.sectionHeading}>
          <p>{project.district ?? "Ярославль"}</p>
          <h2>Другие проекты рядом</h2>
        </div>
        <div className={styles.relatedGrid}>
          {related.map((candidate) => <PropertyCard key={candidate.slug} project={candidate} />)}
        </div>
      </div>
    </section>
  );
}
