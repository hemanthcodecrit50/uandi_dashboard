import { db } from './db';

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  picture: string;
}

function rowToUser(row: UserRow): User {
  return { id: row.id, email: row.email, name: row.name, picture: row.picture };
}

// Called on every successful login — creates the user on first login,
// refreshes profile fields (name/picture can change on Google's side) after.
export function upsertUser(user: User): User {
  const email = user.email.toLowerCase();
  db.prepare(`
    INSERT INTO users (id, email, name, picture, updated_at)
    VALUES (?, ?, ?, ?, unixepoch())
    ON CONFLICT (id)
    DO UPDATE SET email = excluded.email, name = excluded.name, picture = excluded.picture, updated_at = unixepoch()
  `).run(user.id, email, user.name, user.picture);
  return { ...user, email };
}

export function getUserById(id: string): User | null {
  const row = db.prepare('SELECT id, email, name, picture FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

export function getUserByEmail(email: string): User | null {
  const row = db.prepare('SELECT id, email, name, picture FROM users WHERE email = ?').get(email.toLowerCase()) as UserRow | undefined;
  return row ? rowToUser(row) : null;
}

export function getUsersByIds(ids: string[]): User[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT id, email, name, picture FROM users WHERE id IN (${placeholders})`)
    .all(...ids) as UserRow[];
  return rows.map(rowToUser);
}

// Search by email or name, excluding the requester. Used for "add friend".
export function searchUsers(query: string, excludeUserId: string, limit = 10): User[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const like = `%${trimmed.toLowerCase()}%`;
  const rows = db
    .prepare(`
      SELECT id, email, name, picture FROM users
      WHERE id != ? AND (LOWER(email) LIKE ? OR LOWER(name) LIKE ?)
      ORDER BY name
      LIMIT ?
    `)
    .all(excludeUserId, like, like, limit) as UserRow[];
  return rows.map(rowToUser);
}
