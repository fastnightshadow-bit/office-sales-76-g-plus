import type { FavoritesStore } from "./favorites-store.types";

export type { FavoritesStore } from "./favorites-store.types";

export const FAVORITES_STORAGE_KEY = "office-sales-76:favorites";

type StorageEventTarget = Pick<Window, "addEventListener" | "removeEventListener">;

function defaultStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function defaultEventTarget(): StorageEventTarget | undefined {
  return typeof window === "undefined" ? undefined : window;
}

function parseStoredFavorites(raw: string | null): readonly string[] {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const values = parsed.filter((value): value is string => typeof value === "string" && value.length > 0);
    return Object.freeze([...new Set(values)]);
  } catch {
    return [];
  }
}

function equalValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function persist(storage: Storage | undefined, values: readonly string[]): void {
  try {
    storage?.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(values));
  } catch {
    // A quota or privacy-mode error does not make the in-memory demo unusable.
  }
}

export function createFavoritesStore(
  storage: Storage | undefined = defaultStorage(),
  eventTarget: StorageEventTarget | undefined = defaultEventTarget(),
): FavoritesStore {
  let snapshot: readonly string[] = parseStoredFavorites(storage?.getItem(FAVORITES_STORAGE_KEY) ?? null);
  const listeners = new Set<() => void>();
  let storageListenerAttached = false;

  const notify = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const setSnapshot = (next: readonly string[], shouldPersist: boolean): void => {
    if (equalValues(snapshot, next)) return;
    snapshot = Object.freeze([...next]);
    if (shouldPersist) persist(storage, snapshot);
    notify();
  };

  const onStorage = (event: StorageEvent): void => {
    if (event.key !== FAVORITES_STORAGE_KEY) return;
    if (event.storageArea != null && storage !== undefined && event.storageArea !== storage) return;
    setSnapshot(parseStoredFavorites(event.newValue), false);
  };

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    if (!storageListenerAttached && eventTarget !== undefined) {
      eventTarget.addEventListener("storage", onStorage);
      storageListenerAttached = true;
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && storageListenerAttached && eventTarget !== undefined) {
        eventTarget.removeEventListener("storage", onStorage);
        storageListenerAttached = false;
      }
    };
  };

  return {
    subscribe,
    getSnapshot: () => snapshot,
    toggle: (slug: string): void => {
      if (slug.length === 0) return;
      const next = snapshot.includes(slug)
        ? snapshot.filter((value) => value !== slug)
        : [...snapshot, slug];
      setSnapshot(next, true);
    },
    clear: (): void => setSnapshot([], true),
  };
}

export const favoritesStore: FavoritesStore = createFavoritesStore();
