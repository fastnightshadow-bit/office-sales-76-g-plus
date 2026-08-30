import type { Project } from "./catalog.types";

type DetailModule = { default: Project };
type DetailModules = Record<string, () => Promise<DetailModule>>;

const detailModules = import.meta.glob<DetailModule>("../../data/project-details/*.json");

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function createProjectDetailRepository(modules: DetailModules) {
  const detailPromises = new Map<string, Promise<Project | undefined>>();
  return function getDetailBySlug(slug: string): Promise<Project | undefined> {
    const existing = detailPromises.get(slug);
    if (existing) return existing;
    const load = modules[`../../data/project-details/${slug}.json`];
    if (!load) return Promise.resolve(undefined);
    const pending = load()
      .then(({ default: project }) => deepFreeze(project))
      .catch((error: unknown) => {
        if (detailPromises.get(slug) === pending) detailPromises.delete(slug);
        throw error;
      });
    detailPromises.set(slug, pending);
    return pending;
  };
}

export const getProjectDetailBySlug = createProjectDetailRepository(detailModules);
