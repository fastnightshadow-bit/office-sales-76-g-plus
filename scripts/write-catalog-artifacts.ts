import { randomUUID } from "node:crypto";
import { access, cp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { catalogSchema } from "../src/features/catalog/catalog-schema";
import type { Project, ProjectSummary } from "../src/features/catalog/catalog.types";

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
type MovePath = (source: string, destination: string) => Promise<void>;

interface CatalogArtifactOptions {
  move?: MovePath;
}

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

async function pathExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function validateStagedArtifacts(projects: readonly Project[], dataDirectory: string) {
  const slugs = projects.map(({ slug }) => slug);
  const uniqueSlugs = new Set(slugs);
  if (uniqueSlugs.size !== slugs.length) throw new Error("Catalog contains a duplicate slug");
  if (slugs.some((slug) => !/^[a-z0-9-]+$/.test(slug))) throw new Error("Catalog contains an unsafe slug");

  const summaries = JSON.parse(await readFile(resolve(dataDirectory, "projects-summary.json"), "utf8")) as ProjectSummary[];
  if (summaries.length !== projects.length || summaries.some(({ slug }, index) => slug !== projects[index]?.slug)) {
    throw new Error("Staged catalog summary manifest does not match the project inventory");
  }

  const detailDirectory = resolve(dataDirectory, "project-details");
  const detailFiles = (await readdir(detailDirectory)).filter((name) => name.endsWith(".json")).sort();
  const expectedFiles = slugs.map((slug) => `${slug}.json`).sort();
  if (JSON.stringify(detailFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error("Staged catalog detail manifest does not match the project inventory");
  }
  for (const project of projects) {
    const detail = JSON.parse(await readFile(resolve(detailDirectory, `${project.slug}.json`), "utf8")) as Project;
    if (JSON.stringify(detail) !== JSON.stringify(project)) {
      throw new Error(`Staged catalog detail is invalid: ${project.slug}`);
    }
  }
}

export async function writeCatalogArtifacts(
  projects: readonly Project[],
  dataDirectory: string,
  options: CatalogArtifactOptions = {},
) {
  const validatedProjects = catalogSchema.array().parse(projects) as Project[];
  const move = options.move ?? rename;
  const parentDirectory = dirname(dataDirectory);
  const transactionId = randomUUID();
  const directoryName = basename(dataDirectory);
  const stagingDirectory = resolve(parentDirectory, `.${directoryName}-catalog-staging-${transactionId}`);
  const backupDirectory = resolve(parentDirectory, `.${directoryName}-catalog-backup-${transactionId}`);
  let liveMovedToBackup = false;
  let stagingPromoted = false;

  try {
    await cp(dataDirectory, stagingDirectory, { recursive: true });
    const detailDirectory = resolve(stagingDirectory, "project-details");
    await rm(detailDirectory, { recursive: true, force: true });
    await mkdir(detailDirectory, { recursive: true });
    await Promise.all([
      writeFile(
        resolve(stagingDirectory, "projects-summary.json"),
        json(validatedProjects.map(createProjectSummary)),
        "utf8",
      ),
      ...validatedProjects.map((project) => writeFile(
        resolve(detailDirectory, `${project.slug}.json`),
        json(project),
        "utf8",
      )),
    ]);
    await validateStagedArtifacts(validatedProjects, stagingDirectory);

    await move(dataDirectory, backupDirectory);
    liveMovedToBackup = true;
    await move(stagingDirectory, dataDirectory);
    stagingPromoted = true;
    await rm(backupDirectory, { recursive: true, force: true });
    liveMovedToBackup = false;
  } catch (error) {
    if (liveMovedToBackup) {
      if (stagingPromoted || await pathExists(dataDirectory)) {
        await rm(dataDirectory, { recursive: true, force: true });
      }
      await move(backupDirectory, dataDirectory);
      liveMovedToBackup = false;
    }
    throw error;
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
    if (!liveMovedToBackup) await rm(backupDirectory, { recursive: true, force: true });
  }
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
