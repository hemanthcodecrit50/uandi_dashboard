import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import {
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  type FriendEntry,
  type IncomingRequest,
  type OutgoingRequest,
} from '@/lib/friendStore';

export const runtime = 'nodejs';

export interface FriendsResponse {
  friends: FriendEntry[];
  incoming: IncomingRequest[];
  outgoing: OutgoingRequest[];
}

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    friends: listFriends(session.userId),
    incoming: listIncomingRequests(session.userId),
    outgoing: listOutgoingRequests(session.userId),
  });
}
