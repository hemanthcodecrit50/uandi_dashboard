/**
 * StorageProvider — abstract key-value storage interface.
 *
 * The UI and store never know whether data comes from localStorage,
 * SQLite, PostgreSQL, or an in-memory map. This interface is the
 * seam that makes storage backends swappable.
 */
export interface StorageProvider {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
