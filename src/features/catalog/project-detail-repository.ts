import type { Project } from "./catalog.types";

const detailModules = import.meta.glob<{ default: Project }>("../../data/project-details/*.json");
const detailPromises = new Map<string, Promise<Project | undefined>>();

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function getProjectDetailBySlug(slug: string): Promise<Project | undefined> {
  const existing = detailPromises.get(slug);
  if (existing) return existing;
  const load = detailModules[`../../data/project-details/${slug}.json`];
  if (!load) return Promise.resolve(undefined);
  const pending = load().then(({ default: project }) => deepFreeze(project));
  detailPromises.set(slug, pending);
  return pending;
}
