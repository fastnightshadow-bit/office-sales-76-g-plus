import projectSummariesJson from "../../data/projects-summary.json";
import type { ProjectSummary } from "./catalog.types";

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

// Import and CI tests schema-validate this generated snapshot. Runtime consumers
// keep only the immutable typed data and do not ship the validation library.
const PROJECTS: readonly ProjectSummary[] = deepFreeze(projectSummariesJson as ProjectSummary[]);

export function getProjects(): readonly ProjectSummary[] {
  return PROJECTS;
}

export function getProjectBySlug(slug: string): ProjectSummary | undefined {
  return PROJECTS.find((project) => project.slug === slug);
}
