import { google, gmail_v1 } from 'googleapis';
import { createOAuthClient } from './googleAuth';
import { tokenStore, StoredTokens } from './tokenStore';

// ─── Public types ──────────────────────────────────────────────────────────────

export type Urgency = 'critical' | 'high' | 'medium' | 'low';

export interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  subject: string;
  snippet: string;
  date: string;    // ISO string
  isRead: boolean;
  urgency: Urgency;
  labelIds: string[];
}

export interface EmailsResponse {
  messages: EmailMessage[];
  nextPageToken?: string;
  totalUnread: number;
  fromCache: boolean;
}

// ─── Custom errors ─────────────────────────────────────────────────────────────

export class RateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// ─── Per-user rate limiting ────────────────────────────────────────────────────
// In production, replace this with Redis so limits are shared across instances.
// Gmail API quota: 250 units/user/second; list=5u, get=5u → ~25 messages = 130u.

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQ = 10; // 10 fetches/user/minute

function checkRateLimit(userId: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }
  if (entry.count >= RATE_LIMIT_MAX_REQ) {
    throw new RateLimitError(entry.resetAt - now);
  }
  entry.count++;
}

// ─── Server-side email cache ───────────────────────────────────────────────────
// In production, replace with Redis so cache is shared across instances.

interface CacheEntry {
  data: EmailsResponse;
  expiresAt: number;
}

const emailCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60_000; // 5 minutes

// Prevent unbounded memory growth — evict expired entries every 10 minutes.
const _cleanupTimer = setInterval(() => {
  const now = Date.now();
  Array.from(emailCache.keys())
    .filter(k => (emailCache.get(k)?.expiresAt ?? 0) < now)
    .forEach(k => emailCache.delete(k));
  Array.from(rateLimitStore.keys())
    .filter(k => (rateLimitStore.get(k)?.resetAt ?? 0) < now)
    .forEach(k => rateLimitStore.delete(k));
}, 10 * 60_000);
if (typeof _cleanupTimer === 'object') (_cleanupTimer as NodeJS.Timeout).unref();

export function invalidateUserCache(userId: string): void {
  Array.from(emailCache.keys())
    .filter(k => k.startsWith(`${userId}:`))
    .forEach(k => emailCache.delete(k));
}

// ─── Automatic token refresh ───────────────────────────────────────────────────

async function getValidTokens(userId: string): Promise<StoredTokens> {
  const tokens = await tokenStore.get(userId);
  if (!tokens) throw new AuthError('No tokens found — user must re-authenticate');

  const REFRESH_BUFFER_MS = 5 * 60_000; // Refresh 5 min before expiry
  if (Date.now() < tokens.expiresAt - REFRESH_BUFFER_MS) return tokens;

  const client = createOAuthClient();
  client.setCredentials({ refresh_token: tokens.refreshToken });

  try {
    const { credentials } = await client.refreshAccessToken();
    const expiresAt = credentials.expiry_date ?? Date.now() + 3600_000;
    await tokenStore.updateAccessToken(userId, credentials.access_token!, expiresAt);
    return { ...tokens, accessToken: credentials.access_token!, expiresAt };
  } catch {
    // Refresh token revoked — clear stored tokens, force re-auth
    await tokenStore.delete(userId);
    throw new AuthError('Refresh token expired or revoked — user must re-authenticate');
  }
}

// ─── Urgency classification (server-side, never exposed to client) ─────────────

const CRITICAL_RE = /\b(urgent|asap|critical|emergency|immediately|action required|account suspended|verify now)\b/i;
const HIGH_RE = /\b(deadline|due today|reminder|important|review needed|approval|expir|overdue|follow[ -]?up)\b/i;

function classifyUrgency(subject: string, snippet: string, labelIds: string[]): Urgency {
  const text = `${subject} ${snippet}`;
  const isUnread = labelIds.includes('UNREAD');

  if (CRITICAL_RE.test(text)) return 'critical';
  if (HIGH_RE.test(text) && isUnread) return 'high';
  if (isUnread) return 'medium';
  return 'low';
}

// ─── Header helpers ────────────────────────────────────────────────────────────

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[], name: string): string {
  return headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function parseFrom(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim().replace(/^["']|["']$/g, ''), email: match[2].trim() };
  return { name: raw.trim(), email: raw.trim() };
}

// ─── Main fetch function ───────────────────────────────────────────────────────

export async function fetchEmails(
  userId: string,
  opts: { pageToken?: string; maxResults?: number; forceRefresh?: boolean } = {},
): Promise<EmailsResponse> {
  checkRateLimit(userId);

  const cacheKey = `${userId}:${opts.pageToken ?? 'first'}`;

  if (!opts.forceRefresh) {
    const cached = emailCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) return { ...cached.data, fromCache: true };
  }

  const tokens = await getValidTokens(userId);
  const client = createOAuthClient();
  client.setCredentials({ access_token: tokens.accessToken });

  const gmail = google.gmail({ version: 'v1', auth: client });
  const maxResults = opts.maxResults ?? 20;

  // List inbox messages
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    labelIds: ['INBOX'],
    maxResults,
    pageToken: opts.pageToken,
  });

  const msgIds = listRes.data.messages ?? [];
  if (msgIds.length === 0) {
    return { messages: [], totalUnread: 0, fromCache: false };
  }

  // Fetch metadata for each message in parallel (no full body — avoids large payloads)
  const settled = await Promise.allSettled(
    msgIds.map(({ id }) =>
      gmail.users.messages.get({
        userId: 'me',
        id: id!,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date'],
      })
    )
  );

  const messages: EmailMessage[] = [];
  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    const msg = result.value.data;
    const headers = msg.payload?.headers ?? [];
    const { name: fromName, email: fromEmail } = parseFrom(getHeader(headers, 'From'));
    const subject = getHeader(headers, 'Subject') || '(no subject)';
    const date = getHeader(headers, 'Date');
    const labelIds = msg.labelIds ?? [];

    messages.push({
      id: msg.id!,
      threadId: msg.threadId!,
      from: fromEmail,
      fromName,
      subject,
      snippet: msg.snippet ?? '',
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      isRead: !labelIds.includes('UNREAD'),
      urgency: classifyUrgency(subject, msg.snippet ?? '', labelIds),
      labelIds,
    });
  }

  // Unread count (lightweight — just the result size estimate)
  const unreadRes = await gmail.users.messages.list({
    userId: 'me',
    labelIds: ['INBOX', 'UNREAD'],
    maxResults: 1,
  }).catch(() => ({ data: { resultSizeEstimate: 0 } }));

  const result: EmailsResponse = {
    messages,
    nextPageToken: listRes.data.nextPageToken ?? undefined,
    totalUnread: unreadRes.data.resultSizeEstimate ?? 0,
    fromCache: false,
  };

  emailCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });

  return result;
}

// ─── Fetch single message body ───────────────────────────────────────────────

export async function fetchMessageBody(
  userId: string,
  messageId: string,
): Promise<{ body: string }> {
  checkRateLimit(userId);

  const tokens = await getValidTokens(userId);
  const client = createOAuthClient();
  client.setCredentials({ access_token: tokens.accessToken });

  const gmail = google.gmail({ version: 'v1', auth: client });
  const msg = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const payload = msg.data.payload;
  if (!payload) return { body: '' };

  function extractText(part: gmail_v1.Schema$MessagePart): string {
    // multipart — recurse into parts
    if (part.parts) {
      // Prefer text/html, fall back to text/plain
      const html = part.parts.find(p => p.mimeType === 'text/html');
      const plain = part.parts.find(p => p.mimeType === 'text/plain');
      if (html?.body?.data) return Buffer.from(html.body.data, 'base64url').toString('utf-8');
      if (plain?.body?.data) return `<pre>${Buffer.from(plain.body.data, 'base64url').toString('utf-8')}</pre>`;
      // Nested multipart
      for (const sub of part.parts) {
        if (sub.parts) {
          const nested = extractText(sub);
          if (nested) return nested;
        }
      }
      return '';
    }
    // Single part
    if (part.body?.data) {
      const text = Buffer.from(part.body.data, 'base64url').toString('utf-8');
      return part.mimeType === 'text/plain' ? `<pre>${text}</pre>` : text;
    }
    return '';
  }

  return { body: extractText(payload) };
}
