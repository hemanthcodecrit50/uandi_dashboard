import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { fetchMessageBody, RateLimitError, AuthError } from '@/lib/gmailClient';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<{ body: string } | { error: string; retryAfterMs?: number; message?: string }>> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await fetchMessageBody(session.userId, params.id);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfterMs: err.retryAfterMs },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(err.retryAfterMs / 1000)) } },
      );
    }
    if (err instanceof AuthError) {
      return NextResponse.json({ error: 'auth_required', message: err.message }, { status: 401 });
    }
    console.error('[gmail/messages/[id]]', err);
    return NextResponse.json({ error: 'Failed to fetch message body' }, { status: 500 });
  }
}
