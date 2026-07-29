import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { cancelOrRemove, FriendshipError } from '@/lib/friendStore';

export const runtime = 'nodejs';

// Unfriends an accepted friendship, or cancels a pending request the caller
// sent — either participant may call this.
export async function DELETE(
  _req: Request,
  { params }: { params: { friendshipId: string } },
): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    cancelOrRemove(params.friendshipId, session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof FriendshipError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
