import type { CatalogQuery, CatalogSort, CompletionFilter, Project } from "./catalog.types";

function searchableText(project: Project): string {
  return [project.title, project.shortDescription, project.district, project.address]
    .filter((value): value is string => value !== undefined)
    .join(" ")
    .toLocaleLowerCase("ru-RU");
}

function matchesCompletion(project: Project, filter: CompletionFilter): boolean {
  if (filter === "all") return true;
  const completionDate = project.completionDate;
  if (completionDate === undefined) return false;
  if (filter === "ready") return completionDate === "ready";
  if (filter === "2028+") {
    const match = completionDate.match(/^(\d{4})-Q[1-4]$/);
    return match !== null && Number(match[1]) >= 2028;
  }
  return /^\d{4}-Q[1-4]$/.test(completionDate) && completionDate.startsWith(`${filter}-Q`);
}

function matchesRooms(project: Project, rooms: NonNullable<CatalogQuery["rooms"]>): boolean {
  const projectRooms = new Set([
    ...project.roomPrices.map(({ room }) => room),
    ...project.layouts.map(({ room }) => room),
  ]);
  return rooms.some((room) => projectRooms.has(room));
}

function completionRank(value: string | undefined): [number, number, number] {
  if (value === "ready") return [0, 0, 0];
  const match = value?.match(/^(\d{4})-Q([1-4])$/);
  return match === null || match === undefined
    ? [2, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
    : [1, Number(match[1]), Number(match[2])];
}

function comparePrice(a: Project, b: Project, descending: boolean): number {
  const aPrice = a.minimumPrice;
  const bPrice = b.minimumPrice;
  if (aPrice === undefined && bPrice === undefined) return 0;
  if (aPrice === undefined) return 1;
  if (bPrice === undefined) return -1;
  return descending ? bPrice - aPrice : aPrice - bPrice;
}

function compareCompletion(a: Project, b: Project): number {
  const [aGroup, aYear, aQuarter] = completionRank(a.completionDate);
  const [bGroup, bYear, bQuarter] = completionRank(b.completionDate);
  return aGroup - bGroup || aYear - bYear || aQuarter - bQuarter;
}

function sortProjects(projects: Project[], sort: CatalogSort | undefined): Project[] {
  if (sort === undefined || sort === "featured") return projects;
  return projects.map((project, index) => ({ project, index })).sort((a, b) => {
    const comparison = sort === "completion"
      ? compareCompletion(a.project, b.project)
      : comparePrice(a.project, b.project, sort === "price-desc");
    return comparison || a.index - b.index;
  }).map(({ project }) => project);
}

export function filterProjects(projects: readonly Project[], query: CatalogQuery): Project[] {
  const text = query.text?.toLocaleLowerCase("ru-RU");
  const filtered = projects.filter((project) => {
    if (text !== undefined && !searchableText(project).includes(text)) return false;
    if (query.district !== undefined && project.district !== query.district) return false;
    if (query.rooms !== undefined && query.rooms.length > 0 && !matchesRooms(project, query.rooms)) return false;
    if (query.completion !== undefined && !matchesCompletion(project, query.completion)) return false;
    if (query.maximumPrice !== undefined
      && (project.minimumPrice === undefined || project.minimumPrice > query.maximumPrice)) return false;
    return true;
  });
  return sortProjects(filtered, query.sort);
}
