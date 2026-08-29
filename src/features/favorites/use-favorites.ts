import { useCallback, useSyncExternalStore } from "react";
import { favoritesStore } from "./favorites-store";
import type { FavoritesStore } from "./favorites-store.types";

const EMPTY_FAVORITES: readonly string[] = Object.freeze([]);

export interface UseFavoritesResult {
  favorites: readonly string[];
  isFavorite(slug: string): boolean;
  toggle(slug: string): void;
  clear(): void;
}

export function useFavorites(store: FavoritesStore = favoritesStore): UseFavoritesResult {
  const favorites = useSyncExternalStore(store.subscribe, store.getSnapshot, () => EMPTY_FAVORITES);
  const toggle = useCallback((slug: string) => store.toggle(slug), [store]);
  const clear = useCallback(() => store.clear(), [store]);
  return { favorites, isFavorite: (slug) => favorites.includes(slug), toggle, clear };
}
