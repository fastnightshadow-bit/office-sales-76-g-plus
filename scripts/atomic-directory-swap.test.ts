import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { promoteStagedDirectories } from "./atomic-directory-swap";

const temporaryDirectories: string[] = [];

async function writeMarker(directory: string, value: string) {
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "marker.txt"), value, "utf8");
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, {
    recursive: true,
    force: true,
  })));
});

describe("promoteStagedDirectories", () => {
  it("rolls every destination back when a later promotion fails", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-swap-"));
    temporaryDirectories.push(root);
    const liveA = join(root, "live/a");
    const liveB = join(root, "live/b");
    const stagedA = join(root, "source/a");
    const stagedB = join(root, "source/b");
    await Promise.all([
      writeMarker(liveA, "old-a"),
      writeMarker(liveB, "old-b"),
      writeMarker(stagedA, "new-a"),
      writeMarker(stagedB, "new-b"),
    ]);
    let moves = 0;
    const failSecondPromotion = async (source: string, destination: string) => {
      moves += 1;
      if (moves === 4) throw new Error("simulated multi-promotion failure");
      await rename(source, destination);
    };

    await expect(promoteStagedDirectories([
      { staged: stagedA, destination: liveA },
      { staged: stagedB, destination: liveB },
    ], { move: failSecondPromotion })).rejects.toThrow("simulated multi-promotion failure");

    await expect(readFile(join(liveA, "marker.txt"), "utf8")).resolves.toBe("old-a");
    await expect(readFile(join(liveB, "marker.txt"), "utf8")).resolves.toBe("old-b");
    expect((await readdir(join(root, "live"))).filter((name) => /staging|backup/.test(name))).toEqual([]);
  });

  it("promotes all validated sources and removes sibling staging and backups", async () => {
    const root = await mkdtemp(join(tmpdir(), "office-sales-swap-"));
    temporaryDirectories.push(root);
    const liveA = join(root, "live/a");
    const liveB = join(root, "live/b");
    const stagedA = join(root, "source/a");
    const stagedB = join(root, "source/b");
    await Promise.all([
      writeMarker(liveA, "old-a"),
      writeMarker(liveB, "old-b"),
      writeMarker(stagedA, "new-a"),
      writeMarker(stagedB, "new-b"),
    ]);

    await promoteStagedDirectories([
      { staged: stagedA, destination: liveA },
      { staged: stagedB, destination: liveB },
    ]);

    await expect(readFile(join(liveA, "marker.txt"), "utf8")).resolves.toBe("new-a");
    await expect(readFile(join(liveB, "marker.txt"), "utf8")).resolves.toBe("new-b");
    expect((await readdir(join(root, "live"))).sort()).toEqual(["a", "b"]);
  });
});
