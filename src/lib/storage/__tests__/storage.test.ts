import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryProvider } from '@/lib/storage/memory';
import { LocalStorageProvider } from '@/lib/storage/local';

describe('InMemoryProvider', () => {
  let storage: InMemoryProvider;

  beforeEach(() => {
    storage = new InMemoryProvider();
  });

  it('returns null for missing key', () => {
    expect(storage.getItem('missing')).toBeNull();
  });

  it('stores and retrieves a string', () => {
    storage.setItem('hello', 'world');
    expect(storage.getItem('hello')).toBe('world');
  });

  it('overwrites an existing key', () => {
    storage.setItem('k', 'v1');
    storage.setItem('k', 'v2');
    expect(storage.getItem('k')).toBe('v2');
  });

  it('removes a key', () => {
    storage.setItem('k', 'v');
    storage.removeItem('k');
    expect(storage.getItem('k')).toBeNull();
  });

  it('handles empty string values', () => {
    storage.setItem('empty', '');
    expect(storage.getItem('empty')).toBe('');
  });

  it('handles keys with special characters', () => {
    storage.setItem('a/b/c', 'slash');
    storage.setItem('a.b.c', 'dot');
    expect(storage.getItem('a/b/c')).toBe('slash');
    expect(storage.getItem('a.b.c')).toBe('dot');
  });
});

describe('LocalStorageProvider', () => {
  let storage: LocalStorageProvider;

  beforeEach(() => {
    localStorage.clear();
    storage = new LocalStorageProvider();
  });

  it('returns null for missing key', () => {
    expect(storage.getItem('missing')).toBeNull();
  });

  it('stores and retrieves a string', () => {
    storage.setItem('hello', 'world');
    expect(storage.getItem('hello')).toBe('world');
  });

  it('removes a key', () => {
    storage.setItem('k', 'v');
    storage.removeItem('k');
    expect(storage.getItem('k')).toBeNull();
  });
});
