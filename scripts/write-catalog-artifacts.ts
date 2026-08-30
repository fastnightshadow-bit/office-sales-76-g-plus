import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Project, ProjectSummary } from "../src/features/catalog/catalog.types";

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

export function createProjectSummary(project: Project): ProjectSummary {
  return {
    slug: project.slug,
    title: project.title,
    shortDescription: project.shortDescription,
    ...(project.district ? { district: project.district } : {}),
    ...(project.address ? { address: project.address } : {}),
    ...(project.completionLabel ? { completionLabel: project.completionLabel } : {}),
    ...(project.completionDate ? { completionDate: project.completionDate } : {}),
    ...(project.minimumPrice !== undefined ? { minimumPrice: project.minimumPrice } : {}),
    roomPrices: project.roomPrices,
    availableRooms: [...new Set([
      ...project.roomPrices.map(({ room }) => room),
      ...project.layouts.map(({ room }) => room),
    ])],
    ...(project.mortgageRateLabel ? { mortgageRateLabel: project.mortgageRateLabel } : {}),
    ...(project.coverImage ? { coverImage: project.coverImage } : {}),
    relatedProjectSlugs: project.relatedProjectSlugs,
    sourceUrl: project.sourceUrl,
    sourceCheckedAt: project.sourceCheckedAt,
    dataQualityFlags: project.dataQualityFlags,
  };
}

export async function writeCatalogArtifacts(projects: readonly Project[], dataDirectory: string) {
  const detailDirectory = resolve(dataDirectory, "project-details");
  await rm(detailDirectory, { recursive: true, force: true });
  await mkdir(detailDirectory, { recursive: true });
  await Promise.all([
    writeFile(
      resolve(dataDirectory, "projects-summary.json"),
      json(projects.map(createProjectSummary)),
      "utf8",
    ),
    ...projects.map((project) => writeFile(
      resolve(detailDirectory, `${project.slug}.json`),
      json(project),
      "utf8",
    )),
  ]);
}

async function main() {
  const dataDirectory = resolve(process.cwd(), "src/data");
  const projects = JSON.parse(await readFile(resolve(dataDirectory, "projects.json"), "utf8")) as Project[];
  await writeCatalogArtifacts(projects, dataDirectory);
  console.log(`Generated catalog artifacts: ${projects.length} summaries and ${projects.length} details`);
}

const entryPoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (entryPoint === import.meta.url) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
