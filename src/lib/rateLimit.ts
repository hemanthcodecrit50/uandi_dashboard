// Simple in-memory rate limiter for API proxy routes.
// Per-IP, sliding window. Good enough for single-instance dev/small deploy.

const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;      // 1 minute
const MAX_REQ = 20;            // 20 requests per window

// Cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  Array.from(store.entries())
    .filter(([, v]) => now > v.resetAt)
    .forEach(([k]) => store.delete(k));
}, 5 * 60_000);

export function checkRateLimit(ip: string): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfterMs: 0 };
  }

  if (entry.count >= MAX_REQ) {
    return { ok: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { ok: true, retryAfterMs: 0 };
}
