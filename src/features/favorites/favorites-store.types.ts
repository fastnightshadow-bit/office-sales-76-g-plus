export interface FavoritesStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): readonly string[];
  toggle(slug: string): void;
  clear(): void;
}
