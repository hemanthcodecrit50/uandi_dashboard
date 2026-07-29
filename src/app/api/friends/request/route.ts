import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getUserByEmail } from '@/lib/userStore';
import { sendRequest, FriendshipError } from '@/lib/friendStore';
import { checkRateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = checkRateLimit(`friend-request:${session.userId}`);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Rate limited — retry in ${Math.ceil(rl.retryAfterMs / 1000)}s` },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

  const target = getUserByEmail(email);
  if (!target) return NextResponse.json({ error: 'No user found with that email' }, { status: 404 });

  try {
    const friendship = sendRequest(session.userId, target.id);
    return NextResponse.json({ friendship });
  } catch (err) {
    if (err instanceof FriendshipError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
