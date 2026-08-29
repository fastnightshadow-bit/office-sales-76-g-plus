import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFavoritesStore, FAVORITES_STORAGE_KEY } from "./favorites-store";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

class StorageEvents {
  private listener: ((event: StorageEvent) => void) | undefined;

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (type === "storage") this.listener = listener as (event: StorageEvent) => void;
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    if (type === "storage" && this.listener === listener) this.listener = undefined;
  }

  dispatch(event: Pick<StorageEvent, "key" | "newValue" | "storageArea">): void {
    this.listener?.(event as StorageEvent);
  }

  get hasListener(): boolean {
    return this.listener !== undefined;
  }
}

describe("favorites store", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("toggles favorites, persists them, and prevents duplicate stored values", () => {
    storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(["alpha", "alpha", 7, "beta"]));
    const store = createFavoritesStore(storage);

    expect(store.getSnapshot()).toEqual(["alpha", "beta"]);
    store.toggle("gamma");
    expect(store.getSnapshot()).toEqual(["alpha", "beta", "gamma"]);
    expect(JSON.parse(storage.getItem(FAVORITES_STORAGE_KEY)!)).toEqual(["alpha", "beta", "gamma"]);
    store.toggle("alpha");
    expect(store.getSnapshot()).toEqual(["beta", "gamma"]);
  });

  it("recovers malformed JSON as an empty snapshot", () => {
    storage.setItem(FAVORITES_STORAGE_KEY, "{not-json");
    const store = createFavoritesStore(storage);

    expect(store.getSnapshot()).toEqual([]);
    store.toggle("restored");
    expect(JSON.parse(storage.getItem(FAVORITES_STORAGE_KEY)!)).toEqual(["restored"]);
  });

  it("notifies subscribers only when the snapshot changes", () => {
    const store = createFavoritesStore(storage);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.clear();
    expect(listener).not.toHaveBeenCalled();
    store.toggle("alpha");
    expect(listener).toHaveBeenCalledTimes(1);
    store.toggle("alpha");
    expect(listener).toHaveBeenCalledTimes(2);
    store.toggle("beta");
    store.clear();
    expect(listener).toHaveBeenCalledTimes(4);
    store.clear();
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
    store.toggle("beta");
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it("synchronizes valid storage events and detaches the listener after unsubscribe", () => {
    const storage = new MemoryStorage();
    const events = new StorageEvents();
    const store = createFavoritesStore(storage, events);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    expect(events.hasListener).toBe(true);
    events.dispatch({
      key: FAVORITES_STORAGE_KEY,
      newValue: JSON.stringify(["remote", "remote", 3]),
      storageArea: storage,
    });
    expect(store.getSnapshot()).toEqual(["remote"]);
    expect(listener).toHaveBeenCalledTimes(1);
    events.dispatch({ key: FAVORITES_STORAGE_KEY, newValue: JSON.stringify(["remote"]), storageArea: storage });
    expect(listener).toHaveBeenCalledTimes(1);
    events.dispatch({ key: FAVORITES_STORAGE_KEY, newValue: "bad-json", storageArea: storage });
    expect(store.getSnapshot()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    expect(events.hasListener).toBe(false);
  });

  it("clears favorites once when localStorage.clear emits a null-key event", () => {
    const events = new StorageEvents();
    storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(["remote"]));
    const store = createFavoritesStore(storage, events);
    const listener = vi.fn();
    store.subscribe(listener);

    events.dispatch({ key: null, newValue: null, storageArea: storage });
    expect(store.getSnapshot()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);

    events.dispatch({ key: null, newValue: null, storageArea: storage });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("ignores unrelated keys and storage areas", () => {
    const events = new StorageEvents();
    const otherStorage = new MemoryStorage();
    const store = createFavoritesStore(storage, events);
    const listener = vi.fn();
    store.subscribe(listener);
    store.toggle("local");

    events.dispatch({ key: "other-key", newValue: JSON.stringify(["remote"]), storageArea: storage });
    events.dispatch({ key: FAVORITES_STORAGE_KEY, newValue: JSON.stringify(["remote"]), storageArea: otherStorage });

    expect(store.getSnapshot()).toEqual(["local"]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps getSnapshot identity stable between changes", () => {
    const store = createFavoritesStore(storage);
    const first = store.getSnapshot();
    expect(store.getSnapshot()).toBe(first);
    store.toggle("alpha");
    expect(store.getSnapshot()).not.toBe(first);
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });
});
