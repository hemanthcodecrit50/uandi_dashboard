// @vitest-environment node
import { webcrypto } from 'node:crypto';
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = webcrypto;
}
import { describe, it, expect } from 'vitest';
import { createSessionToken } from '@/lib/session';
import { jwtVerify } from 'jose';

const TEST_SECRET = 'a'.repeat(32);

function secretToKey(s: string): Uint8Array {
  const buf = Buffer.alloc(s.length);
  buf.write(s);
  return new Uint8Array(buf);
}

function setSecret() {
  process.env.SESSION_SECRET = TEST_SECRET;
}

describe('session', () => {
  it('creates a valid JWT token', async () => {
    setSecret();
    const token = await createSessionToken({ userId: 'u1', email: 'test@example.com' });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('token contains correct claims', async () => {
    setSecret();
    const token = await createSessionToken({ userId: 'u123', email: 'a@b.com' });
    const { payload } = await jwtVerify(token, secretToKey(TEST_SECRET));
    expect(payload.userId).toBe('u123');
    expect(payload.email).toBe('a@b.com');
    expect(payload.iat).toBeDefined();
    expect(payload.exp).toBeDefined();
  });

  it('token expires in ~30 days', async () => {
    setSecret();
    const token = await createSessionToken({ userId: 'u1', email: 'a@b.com' });
    const { payload } = await jwtVerify(token, secretToKey(TEST_SECRET));
    const now = Math.floor(Date.now() / 1000);
    const thirtyDays = 30 * 24 * 60 * 60;
    expect(payload.exp! - now).toBeGreaterThan(thirtyDays - 60);
    expect(payload.exp! - now).toBeLessThan(thirtyDays + 60);
  });

  it('throws if SESSION_SECRET is missing', async () => {
    delete process.env.SESSION_SECRET;
    await expect(createSessionToken({ userId: 'u1', email: 'a@b.com' })).rejects.toThrow('SESSION_SECRET');
  });

  it('throws if SESSION_SECRET is too short', async () => {
    process.env.SESSION_SECRET = 'short';
    await expect(createSessionToken({ userId: 'u1', email: 'a@b.com' })).rejects.toThrow('SESSION_SECRET');
  });
});
