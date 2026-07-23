import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt } from '@/lib/crypto';

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(64);
});

describe('encrypt / decrypt', () => {
  it('round-trips a simple string', () => {
    const plaintext = 'hello world';
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it('produces different ciphertexts for same input (random IV)', () => {
    const a = encrypt('test');
    const b = encrypt('test');
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe('test');
    expect(decrypt(b)).toBe('test');
  });

  it('handles empty string', () => {
    const ct = encrypt('');
    expect(decrypt(ct)).toBe('');
  });

  it('handles long strings', () => {
    const long = 'a'.repeat(10_000);
    const ct = encrypt(long);
    expect(decrypt(ct)).toBe(long);
  });

  it('handles special characters', () => {
    const special = '🔐🔑 émojis & ñ characters';
    const ct = encrypt(special);
    expect(decrypt(ct)).toBe(special);
  });

  it('throws on tampered ciphertext', () => {
    const ct = encrypt('secret');
    const parts = ct.split(':');
    // flip a bit in the ciphertext
    const tampered = parts[2].slice(0, -2) + 'ff';
    expect(() => decrypt(`${parts[0]}:${parts[1]}:${tampered}`)).toThrow();
  });

  it('throws on wrong format', () => {
    expect(() => decrypt('no-colons')).toThrow('Invalid ciphertext format');
    expect(() => decrypt('a:b')).toThrow('Invalid ciphertext format');
  });
});
