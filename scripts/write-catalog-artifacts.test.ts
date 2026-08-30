import { mkdtemp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Project } from "../src/features/catalog/catalog.types";
import { writeCatalogArtifacts } from "./write-catalog-artifacts";

const temporaryDirectories: string[] = [];

async function loadProject(): Promise<Project> {
  const projects = JSON.parse(await readFile(resolve(process.cwd(), "src/data/projects.json"), "utf8")) as Project[];
  const project = projects[0];
  if (!project) throw new Error("Expected a project fixture");
  return project;
}

async function createLiveSnapshot(root: string) {
  const dataDirectory = join(root, "data");
  await mkdir(join(dataDirectory, "project-details"), { recursive: true });
  await Promise.all([
    writeFile(join(dataDirectory, "projects-summary.json"), "original summary\n", "utf8"),
    writeFile(join(dataDirectory, "project-details/original.json"), "original detail\n", "utf8"),
    writeFile(join(dataDirectory, "company.json"), "company remains\n", "utf8"),
  ]);
  return dataDirectory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, {
    recursive: true,
    force: true,
  })));
});

describe("writeCatalogArtifacts", () => {
  it("validates the complete staged manifest before replacing the live snapshot", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-catalog-"));
    temporaryDirectories.push(root);
    const dataDirectory = await createLiveSnapshot(root);
    const project = await loadProject();

    await expect(writeCatalogArtifacts([project, project], dataDirectory)).rejects.toThrow(/duplicate slug/i);

    await expect(readFile(join(dataDirectory, "projects-summary.json"), "utf8")).resolves.toBe("original summary\n");
    await expect(readFile(join(dataDirectory, "project-details/original.json"), "utf8")).resolves.toBe("original detail\n");
    expect((await readdir(root)).filter((name) => /catalog-(?:staging|backup)/.test(name))).toEqual([]);
  });

  it("rejects an invalid project before replacing the live snapshot", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-catalog-"));
    temporaryDirectories.push(root);
    const dataDirectory = await createLiveSnapshot(root);
    const project = await loadProject();
    const invalid = { ...project, title: "" };

    await expect(writeCatalogArtifacts([invalid], dataDirectory)).rejects.toThrow();

    await expect(readFile(join(dataDirectory, "projects-summary.json"), "utf8")).resolves.toBe("original summary\n");
    await expect(readFile(join(dataDirectory, "project-details/original.json"), "utf8")).resolves.toBe("original detail\n");
  });

  it("rolls back the live snapshot if promoting the validated sibling staging directory fails", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-catalog-"));
    temporaryDirectories.push(root);
    const dataDirectory = await createLiveSnapshot(root);
    const project = await loadProject();
    let moves = 0;
    const failPromotion = async (source: string, destination: string) => {
      moves += 1;
      if (moves === 2) throw new Error("simulated promotion failure");
      await rename(source, destination);
    };

    await expect(writeCatalogArtifacts([project], dataDirectory, { move: failPromotion }))
      .rejects.toThrow("simulated promotion failure");

    await expect(readFile(join(dataDirectory, "projects-summary.json"), "utf8")).resolves.toBe("original summary\n");
    await expect(readFile(join(dataDirectory, "project-details/original.json"), "utf8")).resolves.toBe("original detail\n");
    await expect(readFile(join(dataDirectory, "company.json"), "utf8")).resolves.toBe("company remains\n");
    expect((await readdir(dirname(dataDirectory))).filter((name) => (
      name.startsWith(`.${basename(dataDirectory)}-catalog-staging-`)
      || name.startsWith(`.${basename(dataDirectory)}-catalog-backup-`)
    ))).toEqual([]);
  });

  it("promotes a validated snapshot and removes sibling transaction directories", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-catalog-"));
    temporaryDirectories.push(root);
    const dataDirectory = await createLiveSnapshot(root);
    const project = await loadProject();

    await writeCatalogArtifacts([project], dataDirectory);

    const summaries = JSON.parse(await readFile(join(dataDirectory, "projects-summary.json"), "utf8")) as Project[];
    expect(summaries.map(({ slug }) => slug)).toEqual([project.slug]);
    const detail = JSON.parse(await readFile(join(dataDirectory, `project-details/${project.slug}.json`), "utf8")) as Project;
    expect(detail).toEqual(project);
    await expect(readFile(join(dataDirectory, "company.json"), "utf8")).resolves.toBe("company remains\n");
    expect((await readdir(root)).filter((name) => /catalog-(?:staging|backup)/.test(name))).toEqual([]);
  });
});
