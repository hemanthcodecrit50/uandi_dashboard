import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { respondToRequest, FriendshipError } from '@/lib/friendStore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { friendshipId?: string; accept?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.friendshipId || typeof body.accept !== 'boolean') {
    return NextResponse.json({ error: 'friendshipId and accept are required' }, { status: 400 });
  }

  try {
    const friendship = respondToRequest(body.friendshipId, session.userId, body.accept);
    return NextResponse.json({ friendship });
  } catch (err) {
    if (err instanceof FriendshipError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
