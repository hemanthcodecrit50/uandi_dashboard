import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { searchUsers, type User } from '@/lib/userStore';
import { checkRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export interface UserSearchResponse {
  users: User[];
}

// Search other users by name/email to add as a friend. Requires a session
// (this is user-directory lookup, not a public endpoint) and is rate-limited
// per-user on top of the session check to prevent directory scraping.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = checkRateLimit(`user-search:${session.userId}`);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limited — retry in ${Math.ceil(rl.retryAfterMs / 1000)}s` },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const q = new URL(req.url).searchParams.get('q') ?? '';
  const results = searchUsers(q, session.userId);
  return NextResponse.json({ users: results });
}
