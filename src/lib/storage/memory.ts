import type { StorageProvider } from './types';

/**
 * InMemoryProvider — ephemeral in-memory backend.
 * Useful for testing, SSR fallback, or when localStorage is unavailable.
 * Data is lost on page refresh.
 */
export class InMemoryProvider implements StorageProvider {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}
