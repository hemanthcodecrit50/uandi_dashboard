import { db } from './db';
import { getUsersByIds, type User } from './userStore';

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
}

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
}

function rowToFriendship(row: FriendshipRow): Friendship {
  return { id: row.id, requesterId: row.requester_id, addresseeId: row.addressee_id, status: row.status };
}

let idCounter = 0;
const genId = () => `fr_${Date.now().toString(36)}_${(++idCounter).toString(36)}`;

function findBetween(userA: string, userB: string): Friendship | null {
  const row = db
    .prepare(`
      SELECT id, requester_id, addressee_id, status FROM friendships
      WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
    `)
    .get(userA, userB, userB, userA) as FriendshipRow | undefined;
  return row ? rowToFriendship(row) : null;
}

export class FriendshipError extends Error {}

// Sending a request when the other person already has a pending request
// to you auto-accepts (mutual interest = instant friends), matching how
// most social products behave.
export function sendRequest(requesterId: string, addresseeId: string): Friendship {
  if (requesterId === addresseeId) {
    throw new FriendshipError('Cannot send a friend request to yourself');
  }

  const existing = findBetween(requesterId, addresseeId);
  if (existing) {
    if (existing.status === 'accepted') return existing;
    if (existing.status === 'blocked') throw new FriendshipError('Cannot send request');
    // status === 'pending'
    if (existing.requesterId === addresseeId) {
      // They already requested us — mutual request, accept immediately.
      db.prepare(`UPDATE friendships SET status = 'accepted', updated_at = unixepoch() WHERE id = ?`).run(existing.id);
      return { ...existing, status: 'accepted' };
    }
    return existing; // already requested, no-op
  }

  const id = genId();
  db.prepare(`
    INSERT INTO friendships (id, requester_id, addressee_id, status)
    VALUES (?, ?, ?, 'pending')
  `).run(id, requesterId, addresseeId);
  return { id, requesterId, addresseeId, status: 'pending' };
}

export function getFriendshipById(id: string): Friendship | null {
  const row = db.prepare('SELECT id, requester_id, addressee_id, status FROM friendships WHERE id = ?').get(id) as FriendshipRow | undefined;
  return row ? rowToFriendship(row) : null;
}

// Only the addressee may accept/reject. Rejecting deletes the row so a
// fresh request can be sent later instead of being permanently stuck.
export function respondToRequest(friendshipId: string, respondingUserId: string, accept: boolean): Friendship {
  const friendship = getFriendshipById(friendshipId);
  if (!friendship) throw new FriendshipError('Request not found');
  if (friendship.addresseeId !== respondingUserId) throw new FriendshipError('Not authorized to respond to this request');
  if (friendship.status !== 'pending') throw new FriendshipError('Request is no longer pending');

  if (!accept) {
    db.prepare('DELETE FROM friendships WHERE id = ?').run(friendshipId);
    return { ...friendship, status: 'blocked' }; // status is moot post-delete; caller only needs to know it's gone
  }

  db.prepare(`UPDATE friendships SET status = 'accepted', updated_at = unixepoch() WHERE id = ?`).run(friendshipId);
  return { ...friendship, status: 'accepted' };
}

// Unfriend — only a participant may remove the friendship.
export function removeFriendship(userId: string, otherUserId: string): void {
  db.prepare(`
    DELETE FROM friendships
    WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
  `).run(userId, otherUserId, otherUserId, userId);
}

// Removes a friendship row by id regardless of status — covers both
// "unfriend an accepted friend" and "cancel my own outgoing request".
// Either participant may call this.
export function cancelOrRemove(friendshipId: string, callerId: string): void {
  const friendship = getFriendshipById(friendshipId);
  if (!friendship) return;
  if (friendship.requesterId !== callerId && friendship.addresseeId !== callerId) {
    throw new FriendshipError('Not authorized to remove this friendship');
  }
  db.prepare('DELETE FROM friendships WHERE id = ?').run(friendshipId);
}

export interface FriendEntry {
  friendshipId: string;
  user: User;
}

export function listFriends(userId: string): FriendEntry[] {
  const rows = db
    .prepare(`
      SELECT id, requester_id, addressee_id FROM friendships
      WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)
    `)
    .all(userId, userId) as { id: string; requester_id: string; addressee_id: string }[];
  const otherIds = rows.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id));
  const users = new Map(getUsersByIds(otherIds).map((u) => [u.id, u]));
  return rows
    .map((r) => {
      const otherId = r.requester_id === userId ? r.addressee_id : r.requester_id;
      const user = users.get(otherId);
      return user ? { friendshipId: r.id, user } : null;
    })
    .filter((e): e is FriendEntry => e !== null);
}

export interface IncomingRequest {
  friendshipId: string;
  from: User;
}

export function listIncomingRequests(userId: string): IncomingRequest[] {
  const rows = db
    .prepare(`SELECT id, requester_id FROM friendships WHERE addressee_id = ? AND status = 'pending'`)
    .all(userId) as { id: string; requester_id: string }[];
  const requesters = getUsersByIds(rows.map((r) => r.requester_id));
  const byId = new Map(requesters.map((u) => [u.id, u]));
  return rows
    .map((r) => ({ friendshipId: r.id, from: byId.get(r.requester_id) }))
    .filter((r): r is IncomingRequest => r.from !== undefined);
}

export interface OutgoingRequest {
  friendshipId: string;
  to: User;
}

export function listOutgoingRequests(userId: string): OutgoingRequest[] {
  const rows = db
    .prepare(`SELECT id, addressee_id FROM friendships WHERE requester_id = ? AND status = 'pending'`)
    .all(userId) as { id: string; addressee_id: string }[];
  const addressees = getUsersByIds(rows.map((r) => r.addressee_id));
  const byId = new Map(addressees.map((u) => [u.id, u]));
  return rows
    .map((r) => ({ friendshipId: r.id, to: byId.get(r.addressee_id) }))
    .filter((r): r is OutgoingRequest => r.to !== undefined);
}

export function areFriends(userId: string, otherUserId: string): boolean {
  if (userId === otherUserId) return true;
  const friendship = findBetween(userId, otherUserId);
  return friendship?.status === 'accepted';
}
