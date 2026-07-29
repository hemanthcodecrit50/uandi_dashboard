// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { upsertUser, getUserById, getUserByEmail, getUsersByIds, searchUsers } from '@/lib/userStore';

describe('userStore', () => {
  it('creates a user on first upsert and returns it by id (email normalized to lowercase)', () => {
    upsertUser({ id: 'u1', email: 'Alice@Example.com', name: 'Alice', picture: 'p1' });
    const found = getUserById('u1');
    expect(found).toEqual({ id: 'u1', email: 'alice@example.com', name: 'Alice', picture: 'p1' });
  });

  it('refreshes profile fields on subsequent upserts without creating duplicates', () => {
    upsertUser({ id: 'u2', email: 'bob@example.com', name: 'Bob', picture: 'old' });
    upsertUser({ id: 'u2', email: 'bob@example.com', name: 'Bobby', picture: 'new' });
    expect(getUserById('u2')?.name).toBe('Bobby');
    expect(getUserById('u2')?.picture).toBe('new');
  });

  it('returns null for unknown id', () => {
    expect(getUserById('nope')).toBeNull();
  });

  it('finds a user by email case-insensitively', () => {
    upsertUser({ id: 'u3', email: 'Carl@Example.com', name: 'Carl', picture: '' });
    expect(getUserByEmail('carl@example.com')?.id).toBe('u3');
  });

  it('batch-fetches users by id, ignoring unknown ids', () => {
    upsertUser({ id: 'u4', email: 'dana@example.com', name: 'Dana', picture: '' });
    upsertUser({ id: 'u5', email: 'evan@example.com', name: 'Evan', picture: '' });
    const found = getUsersByIds(['u4', 'u5', 'unknown']);
    expect(found.map((u) => u.id).sort()).toEqual(['u4', 'u5']);
  });

  it('returns an empty array for getUsersByIds([])', () => {
    expect(getUsersByIds([])).toEqual([]);
  });

  it('searches by partial name or email match, excluding the requester', () => {
    upsertUser({ id: 'u6', email: 'frank@example.com', name: 'Frank Ocean', picture: '' });
    upsertUser({ id: 'u7', email: 'searchtarget@example.com', name: 'Frank Zappa', picture: '' });
    const results = searchUsers('frank', 'u6');
    expect(results.map((u) => u.id)).toEqual(['u7']);
  });

  it('returns nothing for queries shorter than 2 characters', () => {
    expect(searchUsers('f', 'u1')).toEqual([]);
  });
});
