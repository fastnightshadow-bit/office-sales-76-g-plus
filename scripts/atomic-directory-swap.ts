import { randomUUID } from "node:crypto";
import { access, cp, mkdir, rename, rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

export interface DirectoryPromotion {
  staged: string;
  destination: string;
}

interface DirectoryPromotionOptions {
  move?: (source: string, destination: string) => Promise<void>;
}

async function pathExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function promoteStagedDirectories(
  entries: readonly DirectoryPromotion[],
  options: DirectoryPromotionOptions = {},
): Promise<void> {
  if (entries.length === 0) throw new Error("At least one staged directory is required");
  if (new Set(entries.map(({ destination }) => resolve(destination))).size !== entries.length) {
    throw new Error("Directory promotion destinations must be unique");
  }

  const move = options.move ?? rename;
  const transactionId = randomUUID();
  const prepared = entries.map(({ staged, destination }) => {
    const resolvedDestination = resolve(destination);
    const destinationParent = dirname(resolvedDestination);
    const destinationName = basename(resolvedDestination);
    return {
      staged: resolve(staged),
      destination: resolvedDestination,
      siblingStaging: resolve(destinationParent, `.${destinationName}-catalog-staging-${transactionId}`),
      backup: resolve(destinationParent, `.${destinationName}-catalog-backup-${transactionId}`),
      backedUp: false,
      promoted: false,
    };
  });
  let rollbackComplete = false;
  let committed = false;

  try {
    for (const entry of prepared) {
      await mkdir(dirname(entry.destination), { recursive: true });
      await cp(entry.staged, entry.siblingStaging, { recursive: true });
    }
    for (const entry of prepared) {
      if (await pathExists(entry.destination)) {
        await move(entry.destination, entry.backup);
        entry.backedUp = true;
      }
    }
    for (const entry of prepared) {
      await move(entry.siblingStaging, entry.destination);
      entry.promoted = true;
    }
    committed = true;
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    for (const entry of [...prepared].reverse()) {
      if (!entry.promoted) continue;
      try {
        await rm(entry.destination, { recursive: true, force: true });
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    for (const entry of [...prepared].reverse()) {
      if (!entry.backedUp) continue;
      try {
        await move(entry.backup, entry.destination);
        entry.backedUp = false;
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    rollbackComplete = rollbackErrors.length === 0;
    if (rollbackErrors.length > 0) {
      throw new AggregateError(
        [error, ...rollbackErrors],
        "Catalog promotion failed and rollback was incomplete",
        { cause: error },
      );
    }
    throw error;
  } finally {
    await Promise.all(prepared.map(({ siblingStaging }) => rm(siblingStaging, { recursive: true, force: true })));
    if (committed || rollbackComplete) {
      await Promise.all(prepared.map(({ backup }) => rm(backup, { recursive: true, force: true })));
    }
  }
}
