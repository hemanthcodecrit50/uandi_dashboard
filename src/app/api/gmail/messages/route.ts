import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { fetchEmails, RateLimitError, AuthError, EmailsResponse } from '@/lib/gmailClient';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<NextResponse<EmailsResponse | { error: string; retryAfterMs?: number; message?: string }>> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const pageToken    = searchParams.get('pageToken') ?? undefined;
  const forceRefresh = searchParams.get('refresh') === '1';
  const maxResults   = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);

  try {
    const data = await fetchEmails(session.userId, { pageToken, forceRefresh, maxResults });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfterMs: err.retryAfterMs },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(err.retryAfterMs / 1000)) } }
      );
    }
    if (err instanceof AuthError) {
      return NextResponse.json({ error: 'auth_required', message: err.message }, { status: 401 });
    }
    console.error('[gmail/messages]', err);
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
  }
}
