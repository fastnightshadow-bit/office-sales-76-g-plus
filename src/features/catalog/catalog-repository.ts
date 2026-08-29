import projectsJson from "../../data/projects.json";
import { catalogSchema } from "./catalog-schema";
import type { Project } from "./catalog.types";

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

// Fail fast at module load if the generated source snapshot no longer matches its schema.
const PROJECTS: readonly Project[] = deepFreeze(
  catalogSchema.array().parse(projectsJson) as Project[],
);

export function getProjects(): readonly Project[] {
  return PROJECTS;
}

export function getProjectBySlug(slug: string): Project | undefined {
  return PROJECTS.find((project) => project.slug === slug);
}
