// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { upsertUser } from '@/lib/userStore';
import {
  sendRequest,
  respondToRequest,
  removeFriendship,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  areFriends,
  FriendshipError,
} from '@/lib/friendStore';

beforeAll(() => {
  upsertUser({ id: 'alice', email: 'alice@example.com', name: 'Alice', picture: '' });
  upsertUser({ id: 'bob', email: 'bob@example.com', name: 'Bob', picture: '' });
  upsertUser({ id: 'carol', email: 'carol@example.com', name: 'Carol', picture: '' });
  upsertUser({ id: 'dave', email: 'dave@example.com', name: 'Dave', picture: '' });
  upsertUser({ id: 'erin', email: 'erin@example.com', name: 'Erin', picture: '' });
});

describe('friendStore', () => {
  it('rejects self-requests', () => {
    expect(() => sendRequest('alice', 'alice')).toThrow(FriendshipError);
  });

  it('creates a pending request, visible to the addressee as incoming and requester as outgoing', () => {
    const req = sendRequest('alice', 'bob');
    expect(req.status).toBe('pending');
    expect(listIncomingRequests('bob').map((r) => r.from.id)).toEqual(['alice']);
    expect(listOutgoingRequests('alice').map((r) => r.to.id)).toEqual(['bob']);
    expect(listFriends('alice')).toEqual([]);
  });

  it('accepting a request makes both users friends of each other', () => {
    const req = sendRequest('alice', 'bob');
    respondToRequest(req.id, 'bob', true);
    expect(listFriends('alice').map((e) => e.user.id)).toEqual(['bob']);
    expect(listFriends('bob').map((e) => e.user.id)).toEqual(['alice']);
    expect(areFriends('alice', 'bob')).toBe(true);
    expect(areFriends('bob', 'alice')).toBe(true);
  });

  it('only the addressee may respond to a request', () => {
    const req = sendRequest('alice', 'carol');
    expect(() => respondToRequest(req.id, 'alice', true)).toThrow(FriendshipError);
  });

  it('rejecting a request removes it, allowing a fresh request later', () => {
    const req = sendRequest('bob', 'carol');
    respondToRequest(req.id, 'carol', false);
    // The alice -> carol request from the previous test is still legitimately
    // pending; only the bob -> carol one should be gone.
    expect(listIncomingRequests('carol').map((r) => r.friendshipId)).not.toContain(req.id);
    expect(areFriends('bob', 'carol')).toBe(false);

    const req2 = sendRequest('bob', 'carol');
    expect(req2.status).toBe('pending');
    expect(req2.id).not.toBe(req.id);
  });

  it('a mutual request (both sides request each other) auto-accepts', () => {
    sendRequest('dave', 'erin'); // dave -> erin pending
    const mutual = sendRequest('erin', 'dave'); // erin -> dave, mirrors the existing pending in the opposite direction
    expect(mutual.status).toBe('accepted');
    expect(areFriends('dave', 'erin')).toBe(true);
  });

  it('unfriending removes the relationship in either direction', () => {
    expect(areFriends('alice', 'bob')).toBe(true);
    removeFriendship('bob', 'alice');
    expect(areFriends('alice', 'bob')).toBe(false);
    expect(listFriends('alice')).toEqual([]);
  });

  it('sending a duplicate pending request is a no-op, not a second row', () => {
    // alice -> carol is already pending from an earlier test in this file.
    const first = sendRequest('alice', 'carol');
    const second = sendRequest('alice', 'carol');
    expect(second.id).toBe(first.id);
    expect(second.status).toBe('pending');
  });

  it('areFriends is true for a user compared to themself', () => {
    expect(areFriends('alice', 'alice')).toBe(true);
  });
});
