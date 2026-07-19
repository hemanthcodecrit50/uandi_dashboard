import type { StorageProvider } from './types';

/**
 * LocalStorageProvider — browser localStorage backend.
 * This is the default provider for single-user, client-side persistence.
 */
export class LocalStorageProvider implements StorageProvider {
  getItem(key: string): string | null {
    return localStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}
