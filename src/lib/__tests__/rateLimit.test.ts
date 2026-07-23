import { describe, it, expect } from 'vitest';

// We test checkRateLimit directly (it's pure logic despite the module-level timer).
// We import fresh to avoid shared state between test files.

describe('checkRateLimit', () => {
  it('allows the first request for a new IP', async () => {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const ip = `test-ip-${Date.now()}-1`;
    const result = checkRateLimit(ip);
    expect(result.ok).toBe(true);
    expect(result.retryAfterMs).toBe(0);
  });

  it('allows requests up to the limit', async () => {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const ip = `test-ip-${Date.now()}-2`;
    for (let i = 0; i < 19; i++) {
      expect(checkRateLimit(ip).ok).toBe(true);
    }
  });

  it('blocks after exceeding the limit', async () => {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const ip = `test-ip-${Date.now()}-3`;
    for (let i = 0; i < 20; i++) {
      checkRateLimit(ip);
    }
    const result = checkRateLimit(ip);
    expect(result.ok).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('different IPs have separate buckets', async () => {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const base = Date.now();
    const ip1 = `test-ip-${base}-4a`;
    const ip2 = `test-ip-${base}-4b`;

    for (let i = 0; i < 20; i++) {
      checkRateLimit(ip1);
    }
    expect(checkRateLimit(ip1).ok).toBe(false);
    expect(checkRateLimit(ip2).ok).toBe(true);
  });
});
